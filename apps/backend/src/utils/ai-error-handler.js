/**
 * AI Error Handler with Retry Logic and Fallback Mechanisms
 * Provides user-friendly error messages and automatic retry functionality
 */
export class AIErrorHandler {
  constructor() {
    this.maxRetries = 3;
    this.baseDelay = 1000; // 1 second
    this.maxDelay = 10000; // 10 seconds
  }

  /**
   * Execute AI request with retry logic and error handling
   */
  async executeWithRetry(aiFunction, context = {}) {
    let lastError = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`AI request attempt ${attempt}/${this.maxRetries}`);
        const result = await aiFunction();
        return {
          success: true,
          data: result,
          attempt,
        };
      } catch (error) {
        lastError = error;
        console.error(`AI request attempt ${attempt} failed:`, error.message);

        // Check if we should retry
        if (!this.shouldRetry(error) || attempt === this.maxRetries) {
          break;
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(
          this.baseDelay * Math.pow(2, attempt - 1),
          this.maxDelay
        );

        console.log(`Retrying in ${delay}ms...`);
        await this.sleep(delay);
      }
    }

    // All retries failed, return user-friendly error
    return {
      success: false,
      error: this.getUserFriendlyError(lastError, context),
      technicalError: lastError.message,
      attempts: this.maxRetries,
    };
  }

  /**
   * Determine if an error should trigger a retry
   */
  shouldRetry(error) {
    const retryableErrors = [
      "overloaded",
      "503",
      "502",
      "500",
      "timeout",
      "network",
      "rate limit",
      "quota exceeded",
      "temporarily unavailable",
    ];

    const errorMessage = error.message.toLowerCase();
    return retryableErrors.some((retryableError) =>
      errorMessage.includes(retryableError)
    );
  }

  /**
   * Convert technical errors to user-friendly messages
   */
  getUserFriendlyError(error, context = {}) {
    const errorMessage = error.message.toLowerCase();

    // Service overloaded errors
    if (errorMessage.includes("overloaded") || errorMessage.includes("503")) {
      return {
        message:
          "I'm experiencing high demand right now. Please try again in a moment.",
        type: "service_busy",
        retryable: true,
        suggestedDelay: 5000,
      };
    }

    // Rate limit errors
    if (errorMessage.includes("rate limit") || errorMessage.includes("quota")) {
      return {
        message:
          "I'm processing a lot of requests right now. Please wait a moment and try again.",
        type: "rate_limit",
        retryable: true,
        suggestedDelay: 10000,
      };
    }

    // Network/connectivity errors
    if (
      errorMessage.includes("network") ||
      errorMessage.includes("timeout") ||
      errorMessage.includes("502") ||
      errorMessage.includes("500")
    ) {
      return {
        message:
          "I'm having trouble connecting right now. Please check your connection and try again.",
        type: "network_error",
        retryable: true,
        suggestedDelay: 3000,
      };
    }

    // Authentication errors
    if (
      errorMessage.includes("unauthorized") ||
      errorMessage.includes("401") ||
      errorMessage.includes("api key")
    ) {
      return {
        message:
          "There's a configuration issue. Please contact support if this persists.",
        type: "auth_error",
        retryable: false,
      };
    }

    // Content policy errors
    if (
      errorMessage.includes("safety") ||
      errorMessage.includes("policy") ||
      errorMessage.includes("blocked")
    ) {
      return {
        message:
          "I can't process that request. Please try rephrasing your message.",
        type: "content_policy",
        retryable: false,
      };
    }

    // Generic fallback
    return {
      message:
        "I'm having trouble processing your request right now. Please try again in a moment.",
      type: "generic_error",
      retryable: true,
      suggestedDelay: 3000,
    };
  }

  /**
   * Create fallback response when AI is completely unavailable
   */
  createFallbackResponse(userQuery, context = {}) {
    const fallbackResponses = {
      greeting:
        "Hello! I'm experiencing some technical difficulties right now, but I'm here to help. Please try your request again in a moment.",
      task_creation:
        "I'd be happy to help you create that task, but I'm having some technical issues right now. Please try again in a moment, or you can create the task manually.",
      search:
        "I'm having trouble searching right now due to technical issues. Please try again in a moment.",
      general:
        "I'm experiencing some technical difficulties at the moment. Please try your request again in a few seconds.",
    };

    // Simple intent detection for fallback
    const query = userQuery.toLowerCase();
    let responseType = "general";

    if (
      query.includes("hello") ||
      query.includes("hi") ||
      query.includes("hey")
    ) {
      responseType = "greeting";
    } else if (
      query.includes("create") ||
      query.includes("add") ||
      query.includes("task")
    ) {
      responseType = "task_creation";
    } else if (
      query.includes("find") ||
      query.includes("search") ||
      query.includes("show")
    ) {
      responseType = "search";
    }

    return {
      message: fallbackResponses[responseType],
      type: "fallback_response",
      status: "completed",
      data: {
        response: fallbackResponses[responseType],
        fallback: true,
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Sleep utility for retry delays
   */
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Log error for monitoring and debugging
   */
  logError(error, context = {}) {
    console.error("AI Service Error:", {
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
    });

    // Here you could integrate with error monitoring services like:
    // - Sentry
    // - LogSnag (you already have this configured)
    // - DataDog
    // - etc.
  }
}

export const aiErrorHandler = new AIErrorHandler();
