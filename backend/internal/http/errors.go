package httpx

import (
	"errors"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
)

// API contract: clients branch on these codes, so never rename one.
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
	CodeAccountDisabled    = "account_disabled"
)

type ErrorResponse struct {
	Error ErrorBody `json:"error"`
}

type ErrorBody struct {
	Code      string       `json:"code"`
	Message   string       `json:"message"`
	RequestID string       `json:"request_id,omitempty"`
	Fields    []FieldError `json:"fields,omitempty"`
	Details   any          `json:"details,omitempty"`
}

type FieldError struct {
	Field   string `json:"field"`
	Message string `json:"message"`
}

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

// RespondBindError answers 422 with per-field errors for validation failures, else 400.
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
