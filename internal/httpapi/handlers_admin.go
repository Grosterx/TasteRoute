package httpapi

import (
	"log/slog"
	"net/http"

	"github.com/Grosterx/tasteroute/internal/lead"
)

func (a *API) adminLeads(w http.ResponseWriter, r *http.Request) {
	leads, err := lead.List(r.Context(), a.db)
	if err != nil {
		slog.Error("admin leads", "error", err)
		writeError(w, http.StatusInternalServerError, "не удалось загрузить заявки")
		return
	}
	writeJSON(w, http.StatusOK, leads)
}
