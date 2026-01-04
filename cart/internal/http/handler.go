package http

import (
	"errors"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/mockten/mockten/cart/internal/cartstore"
	"github.com/mockten/mockten/cart/internal/service"
	commonauth "github.com/mockten/mockten/common/auth"
)

type Handler struct {
	viewSvc   *service.CartService
	cartStore *cartstore.RedisCartStore
}

func NewHandler(viewSvc *service.CartService, cartStore *cartstore.RedisCartStore) *Handler {
	return &Handler{
		viewSvc:   viewSvc,
		cartStore: cartStore,
	}
}

func (h *Handler) GetMeCart(c *gin.Context) {
	uid, ok := commonauth.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "missing X-User-Id"})
		return
	}

	view, err := h.viewSvc.GetCartView(c.Request.Context(), uid)
	if err != nil {
		if errors.Is(err, cartstore.ErrCartNotFound) {
			c.JSON(http.StatusOK, gin.H{
				"updated_at": time.Now().UTC(),
				"items":      []any{},
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, view)
}

type AddItemReq struct {
	ProductID string `json:"product_id" binding:"required"`
	Quantity  int    `json:"quantity" binding:"required,min=1,max=99"`
}

func (h *Handler) AddItem(c *gin.Context) {
	uid, ok := commonauth.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "missing X-User-Id"})
		return
	}

	var req AddItemReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if _, err := h.cartStore.AddItem(c.Request.Context(), uid, req.ProductID, req.Quantity); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.Status(http.StatusNoContent)
}

type SetQtyReq struct {
	Quantity int `json:"quantity" binding:"required,min=0,max=99"`
}

func (h *Handler) SetItemQty(c *gin.Context) {
	uid, ok := commonauth.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "missing X-User-Id"})
		return
	}

	productID := c.Param("productId")

	var req SetQtyReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if _, err := h.cartStore.SetItemQty(c.Request.Context(), uid, productID, req.Quantity); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.Status(http.StatusNoContent)
}

func (h *Handler) RemoveItem(c *gin.Context) {
	uid, ok := commonauth.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "missing X-User-Id"})
		return
	}

	productID := c.Param("productId")

	if _, err := h.cartStore.RemoveItem(c.Request.Context(), uid, productID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.Status(http.StatusNoContent)
}

func (h *Handler) ClearCart(c *gin.Context) {
	uid, ok := commonauth.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "missing X-User-Id"})
		return
	}

	if _, err := h.cartStore.ClearCart(c.Request.Context(), uid); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.Status(http.StatusNoContent)
}
