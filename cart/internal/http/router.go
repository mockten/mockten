package http

import (
	"github.com/gin-gonic/gin"
	commonauth "github.com/mockten/mockten/common/auth"
)

func RegisterRoutes(r *gin.Engine, h *Handler, authn *commonauth.Authenticator) {
	me := r.Group("/cart")
	me.Use(authn.RequireUserID())
	{
		me.GET("/", h.GetMeCart)
		me.POST("/items", h.AddItem)
		me.PUT("/items/:productId", h.SetItemQty)
		me.DELETE("/items/:productId", h.RemoveItem)
		me.DELETE("/", h.ClearCart)
	}
}
