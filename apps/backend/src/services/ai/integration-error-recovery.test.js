/**
 * Test suite for Integration Error Recovery Service
 */
import { IntegrationErrorRecoveryService } from './integration-error-recovery.service.js';

async function testIntegrationErrorRecovery() {
    console.log('🧪 Testing Integration Error Recovery Service...\n');
    
    const recoveryService = new IntegrationErrorRecoveryService();
    let testsPassed = 0;
    let totalTests = 0;

    // Test 1: Implement Fallback Strategy for Auth Failure
    totalTests++;
    try {
        console.log('Test 1: Implement Fallback Strategy for Authentication Failure');
        
        const authError = new Error('Unauthorized: token expired');
        authError.code = 401;
        
        const result = await recoveryService.implementFallbackStrategy(
            'linear',
            'search',
            authError,
            { query: 'find my issues', userId: 'test-user-123' }
        );
        
        console.log('✅ Auth failure fallback implemented successfully');
        console.log(`   - Success: ${result.success}`);
        console.log(`   - Strategy: ${result.strategy}`);
        console.log(`   - User message: ${result.userMessage}`);
        console.log(`   - Alternative sources: ${result.alternativeSources?.length || 0}`);
        
        if (result.strategy && result.userMessage && result.hasOwnProperty('success')) {
            testsPassed++;
            console.log('✅ Test 1 passed\n');
        } else {
            console.log('❌ Test 1 failed - missing required fields\n');
        }
    } catch (error) {
        console.log(`❌ Test 1 failed: ${error.message}\n`);
    }

    // Test 2: Add Alternative Suggestions
    totalTests++;
    try {
        console.log('Test 2: Add Alternative Suggestions for Unavailable Sources');
        
        const result = await recoveryService.addAlternativeSuggestions(
            ['linear', 'github'],
            'search',
            { query: 'find my tasks and issues' }
        );
        
        console.log('✅ Alternative suggestions generated successfully');
        console.log(`   - Unavailable sources: ${result.unavailableSources.join(', ')}`);
        console.log(`   - Available alternatives: ${result.availableAlternatives?.length || 0}`);
        console.log(`   - Suggestions: ${result.suggestions?.length || 0} provided`);
        console.log(`   - User guidance: ${result.userGuidance}`);
        
        if (result.unavailableSources && result.suggestions && result.userGuidance) {
            testsPassed++;
            console.log('✅ Test 2 passed\n');
        } else {
            console.log('❌ Test 2 failed - missing required fields\n');
        }
    } catch (error) {
        console.log(`❌ Test 2 failed: ${error.message}\n`);
    }

    // Test 3: Create Graceful Degradation
    totalTests++;
    try {
        console.log('Test 3: Create Graceful Degradation for Partial Outage');
        
        const result = await recoveryService.createGracefulDegradation(
            ['linear', 'github'],
            { severity: 'medium', type: 'partial_outage' },
            { userId: 'test-user-123' }
        );
        
        console.log('✅ Graceful degradation created successfully');
        console.log(`   - Estimated impact: ${result.estimatedImpact}`);
        console.log(`   - Affected features: ${result.affectedFeatures?.length || 0}`);
        console.log(`   - Workarounds: ${result.workarounds?.length || 0}`);
        console.log(`   - User explanation: ${result.userExplanation}`);
        
        if (result.estimatedImpact && result.userExplanation && result.recoveryTimeline) {
            testsPassed++;
            console.log('✅ Test 3 passed\n');
        } else {
            console.log('❌ Test 3 failed - missing required fields\n');
        }
    } catch (error) {
        console.log(`❌ Test 3 failed: ${error.message}\n`);
    }

    // Test 4: Rate Limit Fallback Strategy
    totalTests++;
    try {
        console.log('Test 4: Rate Limit Fallback Strategy');
        
        const rateLimitError = new Error('Too many requests');
        rateLimitError.code = 429;
        
        const result = await recoveryService.implementFallbackStrategy(
            'twitter',
            'search',
            rateLimitError,
            { query: 'find my tweets', userId: 'test-user-123' }
        );
        
        console.log('✅ Rate limit fallback implemented successfully');
        console.log(`   - Success: ${result.success}`);
        console.log(`   - Strategy: ${result.strategy}`);
        console.log(`   - Retryable: ${result.retryable}`);
        console.log(`   - Recovery plan: ${result.recoveryPlan ? 'provided' : 'missing'}`);
        
        if (result.strategy === 'queue_request' && result.hasOwnProperty('retryable')) {
            testsPassed++;
            console.log('✅ Test 4 passed\n');
        } else {
            console.log('❌ Test 4 failed - incorrect strategy or missing fields\n');
        }
    } catch (error) {
        console.log(`❌ Test 4 failed: ${error.message}\n`);
    }

    // Test 5: Network Failure with Retry
    totalTests++;
    try {
        console.log('Test 5: Network Failure with Retry Strategy');
        
        const networkError = new Error('Connection timeout');
        networkError.code = 'ECONNREFUSED';
        
        const result = await recoveryService.implementFallbackStrategy(
            'gmail',
            'read',
            networkError,
            { query: 'read my emails', userId: 'test-user-123' }
        );
        
        console.log('✅ Network failure fallback implemented successfully');
        console.log(`   - Success: ${result.success}`);
        console.log(`   - Strategy: ${result.strategy}`);
        console.log(`   - User message: ${result.userMessage}`);
        
        if (result.strategy && result.userMessage) {
            testsPassed++;
            console.log('✅ Test 5 passed\n');
        } else {
            console.log('❌ Test 5 failed - missing strategy or message\n');
        }
    } catch (error) {
        console.log(`❌ Test 5 failed: ${error.message}\n`);
    }

    // Test 6: Unknown Integration Handling
    totalTests++;
    try {
        console.log('Test 6: Unknown Integration Handling');
        
        const unknownError = new Error('Service error');
        
        const result = await recoveryService.implementFallbackStrategy(
            'unknown-service',
            'search',
            unknownError,
            { query: 'test query', userId: 'test-user-123' }
        );
        
        console.log('✅ Unknown integration handled successfully');
        console.log(`   - Success: ${result.success}`);
        console.log(`   - Fallback used: ${result.fallbackUsed}`);
        console.log(`   - User message: ${result.userMessage}`);
        console.log(`   - Retryable: ${result.retryable}`);
        
        if (result.hasOwnProperty('success') && result.userMessage && result.hasOwnProperty('retryable')) {
            testsPassed++;
            console.log('✅ Test 6 passed\n');
        } else {
            console.log('❌ Test 6 failed - missing required fields\n');
        }
    } catch (error) {
        console.log(`❌ Test 6 failed: ${error.message}\n`);
    }

    // Test 7: Integration Configuration
    totalTests++;
    try {
        console.log('Test 7: Integration Configuration Validation');
        
        // Test that all expected integrations are configured
        const expectedIntegrations = ['linear', 'gmail', 'github', 'twitter', 'calendar'];
        let configurationsValid = true;
        
        for (const integration of expectedIntegrations) {
            const config = recoveryService.integrationConfigs.get(integration);
            if (!config || !config.name || !config.capabilities) {
                configurationsValid = false;
                console.log(`   ❌ Missing or invalid config for ${integration}`);
            } else {
                console.log(`   ✅ ${config.name} configured with ${config.capabilities.length} capabilities`);
            }
        }
        
        if (configurationsValid) {
            testsPassed++;
            console.log('✅ Test 7 passed\n');
        } else {
            console.log('❌ Test 7 failed - integration configurations incomplete\n');
        }
    } catch (error) {
        console.log(`❌ Test 7 failed: ${error.message}\n`);
    }

    // Test 8: Fallback Strategy Configuration
    totalTests++;
    try {
        console.log('Test 8: Fallback Strategy Configuration Validation');
        
        const expectedStrategies = ['auth_failure', 'rate_limit', 'network_failure', 'service_unavailable', 'partial_outage'];
        let strategiesValid = true;
        
        for (const strategy of expectedStrategies) {
            const config = recoveryService.fallbackStrategies.get(strategy);
            if (!config || !config.immediate || !config.userMessage) {
                strategiesValid = false;
                console.log(`   ❌ Missing or invalid strategy for ${strategy}`);
            } else {
                console.log(`   ✅ ${strategy} strategy configured with immediate action: ${config.immediate}`);
            }
        }
        
        if (strategiesValid) {
            testsPassed++;
            console.log('✅ Test 8 passed\n');
        } else {
            console.log('❌ Test 8 failed - fallback strategies incomplete\n');
        }
    } catch (error) {
        console.log(`❌ Test 8 failed: ${error.message}\n`);
    }

    // Summary
    console.log('📊 Test Results Summary:');
    console.log(`   Tests passed: ${testsPassed}/${totalTests}`);
    console.log(`   Success rate: ${Math.round((testsPassed / totalTests) * 100)}%`);
    
    if (testsPassed === totalTests) {
        console.log('\n✅ All Integration Error Recovery Service tests passed!');
        return true;
    } else {
        console.log(`\n❌ ${totalTests - testsPassed} test(s) failed.`);
        return false;
    }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    testIntegrationErrorRecovery()
        .then(success => {
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error('Test execution failed:', error);
            process.exit(1);
        });
}

export { testIntegrationErrorRecovery };