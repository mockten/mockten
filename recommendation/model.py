import datetime
import numpy as np
from lightfm import LightFM
from lightfm.data import Dataset
from scipy.sparse import coo_matrix

class RecommendationModel:
    def __init__(self):
        # LightFM loss function configuration:
        # - 'logistic': For explicit feedback (e.g. ratings 1-5).
        # - 'bpr': Bayesian Personalized Ranking. Good for implicit feedback.
        # - 'warp': Weighted Approximate-Rank Pairwise. Optimizes the top of the recommendation list.
        #           It works by iteratively sampling negative items until it finds a violating one,
        #           making it highly suitable for positive-only implicit purchase interaction data.
        self.model = LightFM(
            no_components=128,
            loss='warp',
            learning_rate=0.03,
            item_alpha=1e-6,
            user_alpha=1e-6,
            random_state=42
        )
        self.dataset = Dataset()
        self.user_id_map = {}
        self.item_id_map = {}
        self.item_id_map_reverse = {}
        self.purchased_set = set()
        self.trained_at = None
        self.is_trained = False
        self.item_features_matrix = None

    def train(self, interactions_data: list[dict], item_features_data: list[dict]):
        """
        Train the LightFM hybrid model using MySQL interaction and feature data.
        """
        if not interactions_data:
            print("No interactions data available for training.")
            return

        # Extract all unique users and items
        unique_users = list(set(row["user_id"] for row in interactions_data))
        unique_items = list(set(
            [row["product_id"] for row in interactions_data] +
            [row["product_id"] for row in item_features_data]
        ))
        
        # Extract unique item features
        unique_features = []
        for row in item_features_data:
            unique_features.extend(row["features"])
        unique_features = list(set(unique_features))

        # 1. Fit the Dataset schema
        self.dataset.fit(
            users=unique_users,
            items=unique_items,
            item_features=unique_features
        )

        # Retrieve mappings
        self.user_id_map, _, self.item_id_map, _ = self.dataset.mapping()
        self.item_id_map_reverse = {v: k for k, v in self.item_id_map.items()}

        # 2. Build interactions matrix
        # (user_id, item_id, weight)
        interactions_iterable = (
            (row["user_id"], row["product_id"], float(row["purchase_count"]))
            for row in interactions_data
        )
        interactions_matrix, _ = self.dataset.build_interactions(interactions_iterable)

        # 3. Build item features matrix
        # (item_id, [feature1, feature2, ...])
        features_iterable = (
            (row["product_id"], row["features"])
            for row in item_features_data
        )
        self.item_features_matrix = self.dataset.build_item_features(features_iterable)

        # 4. Train the model
        print(f"Starting LightFM model training with {len(unique_users)} users and {len(unique_items)} items...")
        self.model.fit(
            interactions_matrix,
            item_features=self.item_features_matrix,
            epochs=60,
            num_threads=4
        )

        # 5. Track training metadata
        self.purchased_set = set((row["user_id"], row["product_id"]) for row in interactions_data)
        self.trained_at = datetime.datetime.utcnow().isoformat() + "Z"
        self.is_trained = True
        print(f"Model training complete at {self.trained_at}")

    def recommend(self, user_id: str, all_products: list[dict], limit: int = 10) -> list[dict] | None:
        """
        Produce top-N recommendations for the given user.
        Returns None if user is not in the trained dataset (caller should handle Cold Start).
        """
        lookup_user_id = user_id
        if "@" not in lookup_user_id and (lookup_user_id + "@example.com") in self.user_id_map:
            lookup_user_id = lookup_user_id + "@example.com"

        if not self.is_trained or lookup_user_id not in self.user_id_map:
            return None

        user_idx = self.user_id_map[lookup_user_id]
        
        # Prepare lists of products that are in our model's vocabulary
        valid_products = [p for p in all_products if p["product_id"] in self.item_id_map]
        if not valid_products:
            return []

        item_ids = [p["product_id"] for p in valid_products]
        item_idxs = np.array([self.item_id_map[p_id] for p_id in item_ids], dtype=np.int32)

        # Predict scores for all valid products
        scores = self.model.predict(
            user_idx,
            item_idxs,
            item_features=self.item_features_matrix
        )

        # Create list of (product_dict, score)
        scored_items = []
        for p, score in zip(valid_products, scores):
            # Filter out products already purchased by this user
            if (lookup_user_id, p["product_id"]) in self.purchased_set:
                continue
            scored_items.append({
                "product_id": p["product_id"],
                "product_name": p["product_name"],
                "category_id": p["category_id"],
                "price": float(p["price"]),
                "score": float(score),
                "image_url": f"/api/storage/category_{p['category_id']}.png"
            })

        # Sort by score descending
        scored_items.sort(key=lambda x: x["score"], reverse=True)
        return scored_items[:limit]

    def get_similar_items(self, product_id: str, all_products: list[dict], limit: int = 5) -> list[dict]:
        """
        Find top-N similar items using cosine similarity of item embeddings.
        """
        if not self.is_trained or product_id not in self.item_id_map:
            return []

        target_idx = self.item_id_map[product_id]
        
        # Retrieve representations (biases and embeddings)
        _, item_embeddings = self.model.get_item_representations(self.item_features_matrix)
        
        target_emb = item_embeddings[target_idx]
        target_norm = np.linalg.norm(target_emb)
        if target_norm == 0:
            target_norm = 1e-10

        # Compute cosine similarity with all other items
        dot_products = np.dot(item_embeddings, target_emb)
        norms = np.linalg.norm(item_embeddings, axis=1)
        norms[norms == 0] = 1e-10
        similarities = dot_products / (norms * target_norm)

        # Sort similarities and exclude self
        similar_items = []
        for idx, score in enumerate(similarities):
            if idx == target_idx:
                continue
            
            p_id = self.item_id_map_reverse.get(idx)
            if not p_id:
                continue
                
            # Get product details if available
            p_details = next((p for p in all_products if p["product_id"] == p_id), None)
            name = p_details["product_name"] if p_details else "Unknown Product"
            
            similar_items.append({
                "product_id": p_id,
                "product_name": name,
                "score": float(score)
            })

        similar_items.sort(key=lambda x: x["score"], reverse=True)
        return similar_items[:limit]
