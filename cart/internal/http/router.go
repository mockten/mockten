package http

import "github.com/gin-gonic/gin"

func RegisterRoutes(r *gin.Engine, h *Handler) {
	me := r.Group("/cart")
	{
		me.GET("/", h.GetMeCart)
		me.POST("/items", h.AddItem)
		me.PUT("/items/:productId", h.SetItemQty)
		me.DELETE("/items/:productId", h.RemoveItem)
		me.DELETE("/", h.ClearCart)
	}
}
