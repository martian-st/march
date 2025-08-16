/**
 * Test suite for Enhanced Error Handler Service
 */
import { EnhancedErrorHandlerService } from './enhanced-error-handler.service.js';

async function testEnhancedErrorHandler() {
    console.log('🧪 Testing Enhanced Error Handler Service...\n');
    
    const errorHandler = new EnhancedErrorHandlerService();
    let testsPassed = 0;
    let totalTests = 0;

    // Test 1: Handle Intent Error
    totalTests++;
    try {
        console.log('Test 1: Handle Intent Classification Error');
        
        const intentError = new Error('Failed to classify intent with confidence');
        const result = await errorHandler.handleIntentError(
            intentError,
            'show me my tasks',
            'test-user-123',
            { sourceFilter: ['linear'] }
        );
        
        console.log('✅ Intent error handled successfully');
        console.log(`   - Error type: ${result.errorType}`);
        console.log(`   - Fallback intent: ${result.fallbackIntent?.operationType}`);
        console.log(`   - User message: ${result.userMessage}`);
        console.log(`   - Suggestions: ${result.suggestions?.length || 0} provided`);
        
        if (result.errorType && result.fallbackIntent && result.userMessage) {
            testsPassed++;
            console.log('✅ Test 1 passed\n');
        } else {
            console.log('❌ Test 1 failed - missing required fields\n');
        }
    } catch (error) {
        console.log(`❌ Test 1 failed: ${error.message}\n`);
    }

    // Test 2: Handle Search Error
    totalTests++;
    try {
        console.log('Test 2: Handle Search Error with Integration Issues');
        
        const searchError = new Error('Integration unavailable: linear service timeout');
        const result = await errorHandler.handleSearchError(
            searchError,
            { 
                query: 'find my linear issues',
                sourceFilter: ['linear'],
                timeFilter: 'recent'
            },
            'test-user-123',
            { query: 'find my linear issues' }
        );
        
        console.log('✅ Search error handled successfully');
        console.log(`   - Error type: ${result.errorType}`);
        console.log(`   - Alternative searches: ${result.alternativeSearches?.length || 0}`);
        console.log(`   - User message: ${result.userMessage}`);
        console.log(`   - Can retry: ${result.canRetry}`);
        
        if (result.errorType && result.userMessage && result.hasOwnProperty('canRetry')) {
            testsPassed++;
            console.log('✅ Test 2 passed\n');
        } else {
            console.log('❌ Test 2 failed - missing required fields\n');
        }
    } catch (error) {
        console.log(`❌ Test 2 failed: ${error.message}\n`);
    }

    // Test 3: Generate User-Friendly Error
    totalTests++;
    try {
        console.log('Test 3: Generate User-Friendly Error Message');
        
        const authError = new Error('Unauthorized: token expired');
        authError.code = 401;
        
        const result = await errorHandler.generateUserFriendlyError(authError, {
            query: 'create a github issue',
            userId: 'test-user-123',
            operation: 'create'
        });
        
        console.log('✅ User-friendly error generated successfully');
        console.log(`   - Error category: ${result.errorCategory}`);
        console.log(`   - Severity: ${result.severity}`);
        console.log(`   - User message: ${result.userMessage}`);
        console.log(`   - Suggestions: ${result.suggestions?.length || 0} provided`);
        console.log(`   - Next steps: ${result.nextSteps?.length || 0} provided`);
        
        if (result.errorCategory && result.userMessage && result.suggestions) {
            testsPassed++;
            console.log('✅ Test 3 passed\n');
        } else {
            console.log('❌ Test 3 failed - missing required fields\n');
        }
    } catch (error) {
        console.log(`❌ Test 3 failed: ${error.message}\n`);
    }

    // Test 4: Source Context Extraction
    totalTests++;
    try {
        console.log('Test 4: Source Context Extraction');
        
        const sourceContext = errorHandler.extractSourceContext(
            'show me my linear issues and github repos',
            { sourceFilter: ['linear', 'github'] }
        );
        
        console.log('✅ Source context extracted successfully');
        console.log(`   - Detected sources: ${sourceContext.detectedSources.join(', ')}`);
        console.log(`   - Query mentions sources: ${sourceContext.queryMentionsSources}`);
        console.log(`   - Requested sources: ${sourceContext.requestedSources.join(', ')}`);
        
        if (sourceContext.detectedSources.length > 0 && sourceContext.queryMentionsSources) {
            testsPassed++;
            console.log('✅ Test 4 passed\n');
        } else {
            console.log('❌ Test 4 failed - source detection not working\n');
        }
    } catch (error) {
        console.log(`❌ Test 4 failed: ${error.message}\n`);
    }

    // Test 5: Integration Status Management
    totalTests++;
    try {
        console.log('Test 5: Integration Status Management');
        
        // Update integration status
        errorHandler.updateIntegrationStatus('test-user-123', 'linear', {
            available: false,
            authExpired: true,
            rateLimited: false
        });
        
        // Get integration status
        const status = errorHandler.getIntegrationStatus('test-user-123', 'linear');
        
        console.log('✅ Integration status managed successfully');
        console.log(`   - Available: ${status.available}`);
        console.log(`   - Auth expired: ${status.authExpired}`);
        console.log(`   - Rate limited: ${status.rateLimited}`);
        
        if (status.authExpired === true && status.available === false) {
            testsPassed++;
            console.log('✅ Test 5 passed\n');
        } else {
            console.log('❌ Test 5 failed - status not updated correctly\n');
        }
    } catch (error) {
        console.log(`❌ Test 5 failed: ${error.message}\n`);
    }

    // Test 6: Emergency Fallback
    totalTests++;
    try {
        console.log('Test 6: Emergency Fallback Handling');
        
        const emergencyFallback = errorHandler.getEmergencyFallback(
            'critical_error',
            'test query',
            'test-user-123'
        );
        
        console.log('✅ Emergency fallback generated successfully');
        console.log(`   - Error type: ${emergencyFallback.errorType}`);
        console.log(`   - Severity: ${emergencyFallback.severity}`);
        console.log(`   - User message: ${emergencyFallback.userMessage}`);
        console.log(`   - Can retry: ${emergencyFallback.canRetry}`);
        
        if (emergencyFallback.errorType === 'error_handler_failure' && 
            emergencyFallback.userMessage && 
            emergencyFallback.suggestions) {
            testsPassed++;
            console.log('✅ Test 6 passed\n');
        } else {
            console.log('❌ Test 6 failed - emergency fallback incomplete\n');
        }
    } catch (error) {
        console.log(`❌ Test 6 failed: ${error.message}\n`);
    }

    // Summary
    console.log('📊 Test Results Summary:');
    console.log(`   Tests passed: ${testsPassed}/${totalTests}`);
    console.log(`   Success rate: ${Math.round((testsPassed / totalTests) * 100)}%`);
    
    if (testsPassed === totalTests) {
        console.log('\n✅ All Enhanced Error Handler Service tests passed!');
        return true;
    } else {
        console.log(`\n❌ ${totalTests - testsPassed} test(s) failed.`);
        return false;
    }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    testEnhancedErrorHandler()
        .then(success => {
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error('Test execution failed:', error);
            process.exit(1);
        });
}

export { testEnhancedErrorHandler };