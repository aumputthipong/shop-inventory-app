package httpx

import (
	"errors"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
)

// Stable machine-readable error codes. Clients branch on these, never on the
// human-readable message.
const (
	CodeBadRequest   = "bad_request"
	CodeValidation   = "validation_failed"
	CodeNotFound     = "not_found"
	CodeInternal     = "internal_error"
	CodeUnavailable  = "service_unavailable"
	CodeUnauthorized = "unauthorized"
	CodeForbidden    = "forbidden"
	CodeConflict     = "conflict"

	CodeInvalidCredentials = "invalid_credentials"
	CodeInsufficientStock  = "insufficient_stock"
	CodeInvalidState       = "invalid_state"
)

// ErrorResponse is the single error envelope every endpoint returns.
type ErrorResponse struct {
	Error ErrorBody `json:"error"`
}

// ErrorBody carries the code, a human-readable message and, for validation
// failures, the offending fields.
type ErrorBody struct {
	Code      string       `json:"code"`
	Message   string       `json:"message"`
	RequestID string       `json:"request_id,omitempty"`
	Fields    []FieldError `json:"fields,omitempty"`
	Details   any          `json:"details,omitempty"`
}

// FieldError describes one failed validation constraint.
type FieldError struct {
	Field   string `json:"field"`
	Message string `json:"message"`
}

// RespondError aborts the request with the shared JSON error envelope.
func RespondError(c *gin.Context, status int, code, message string) {
	c.AbortWithStatusJSON(status, ErrorResponse{
		Error: ErrorBody{
			Code:      code,
			Message:   message,
			RequestID: RequestIDFrom(c.Request.Context()),
		},
	})
}

func RespondErrorDetails(c *gin.Context, status int, code, message string, details any) {
	c.AbortWithStatusJSON(status, ErrorResponse{
		Error: ErrorBody{
			Code:      code,
			Message:   message,
			RequestID: RequestIDFrom(c.Request.Context()),
			Details:   details,
		},
	})
}

func RespondFieldError(c *gin.Context, field, message string) {
	c.AbortWithStatusJSON(http.StatusUnprocessableEntity, ErrorResponse{
		Error: ErrorBody{
			Code:      CodeValidation,
			Message:   "request validation failed",
			RequestID: RequestIDFrom(c.Request.Context()),
			Fields:    []FieldError{{Field: field, Message: message}},
		},
	})
}

// RespondInternal logs err with the request id and answers a generic 500.
func RespondInternal(c *gin.Context, err error) {
	_ = c.Error(err)
	RespondError(c, http.StatusInternalServerError, CodeInternal, "internal server error")
}

// RespondBindError turns an error returned by ShouldBind into the shared
// envelope. Validation failures become a per-field 422; anything else, such as
// malformed JSON, becomes a 400.
//
// Handlers use this instead of Bind/MustBind so that gin never writes its own
// error body and never sets a status behind our back.
func RespondBindError(c *gin.Context, err error) {
	var validationErrs validator.ValidationErrors
	if errors.As(err, &validationErrs) {
		fields := make([]FieldError, 0, len(validationErrs))
		for _, fieldErr := range validationErrs {
			fields = append(fields, FieldError{
				Field:   fieldErr.Field(),
				Message: describeConstraint(fieldErr),
			})
		}

		c.AbortWithStatusJSON(http.StatusUnprocessableEntity, ErrorResponse{
			Error: ErrorBody{
				Code:      CodeValidation,
				Message:   "request validation failed",
				RequestID: RequestIDFrom(c.Request.Context()),
				Fields:    fields,
			},
		})
		return
	}

	RespondError(c, http.StatusBadRequest, CodeBadRequest, "request body could not be decoded")
}

// describeConstraint renders one validator tag as a readable sentence.
func describeConstraint(fieldErr validator.FieldError) string {
	switch fieldErr.Tag() {
	case "required":
		return "is required"
	case "email":
		return "must be a valid email address"
	case "min":
		return fmt.Sprintf("must be at least %s", fieldErr.Param())
	case "max":
		return fmt.Sprintf("must be at most %s", fieldErr.Param())
	case "gte":
		return fmt.Sprintf("must be greater than or equal to %s", fieldErr.Param())
	case "lte":
		return fmt.Sprintf("must be less than or equal to %s", fieldErr.Param())
	case "oneof":
		return fmt.Sprintf("must be one of: %s", fieldErr.Param())
	case "gt":
		return fmt.Sprintf("must be greater than %s", fieldErr.Param())
	case "ne":
		return fmt.Sprintf("must not be %s", fieldErr.Param())
	case "unique":
		return "must not contain duplicates"
	default:
		return fmt.Sprintf("failed the %q constraint", fieldErr.Tag())
	}
}
