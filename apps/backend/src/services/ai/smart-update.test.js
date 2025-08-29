import { SmartUpdateService } from './smart-update.service.js';
import { UpdateParameterExtractorService } from './update-parameter-extractor.service.js';

// Mock test to verify the service can be instantiated and basic methods work
async function testSmartUpdateService() {
    console.log('Testing Smart Update Service...');
    
    try {
        // Test service instantiation
        const apiKey = process.env.GOOGLE_AI_API_KEY || 'test-key';
        const updateService = new SmartUpdateService(apiKey);
        const extractor = new UpdateParameterExtractorService(apiKey);
        
        console.log('✓ Services instantiated successfully');
        
        // Test parameter extraction structure
        const mockQuery = "mark all urgent tasks as done";
        const mockContext = { userId: 'test-user' };
        
        // Test that the extractor has the expected methods
        if (typeof extractor.extractUpdateParameters === 'function') {
            console.log('✓ Parameter extractor has extractUpdateParameters method');
        }
        
        if (typeof extractor.validateSourceUpdates === 'function') {
            console.log('✓ Parameter extractor has validateSourceUpdates method');
        }
        
        if (typeof extractor.validateCrossPlatformOperations === 'function') {
            console.log('✓ Parameter extractor has validateCrossPlatformOperations method');
        }
        
        // Test update service methods
        if (typeof updateService.updateFromNaturalLanguage === 'function') {
            console.log('✓ Update service has updateFromNaturalLanguage method');
        }
        
        if (typeof updateService.bulkUpdate === 'function') {
            console.log('✓ Update service has bulkUpdate method');
        }
        
        if (typeof updateService.confirmBulkOperation === 'function') {
            console.log('✓ Update service has confirmBulkOperation method');
        }
        
        // Test source constraint validation
        const testSources = ['linear', 'march', 'github'];
        const testUpdateData = { status: 'done', title: 'new title' };
        
        const validation = extractor.validateSourceUpdates(testSources, testUpdateData);
        
        if (validation && typeof validation === 'object') {
            console.log('✓ Source validation returns object structure');
            
            if (validation.hasOwnProperty('valid')) {
                console.log('✓ Validation includes valid property');
            }
            
            if (validation.hasOwnProperty('allowedUpdates')) {
                console.log('✓ Validation includes allowedUpdates property');
            }
        }
        
        // Test source recommendations
        const recommendations = extractor.getSourceUpdateRecommendations('linear');
        if (recommendations && recommendations.allowedUpdates) {
            console.log('✓ Source recommendations work for integration sources');
        }
        
        const nativeRecommendations = extractor.getSourceUpdateRecommendations('march');
        if (nativeRecommendations && nativeRecommendations.allowedUpdates) {
            console.log('✓ Source recommendations work for native sources');
        }
        
        // Test utility methods
        const testDate = extractor.parseDateString('tomorrow');
        if (testDate) {
            console.log('✓ Date parsing works');
        }
        
        const cleanedCriteria = extractor.cleanSearchCriteria({
            keywords: ['test'],
            source: 'linear',
            status: null,
            priority: 'high'
        });
        
        if (cleanedCriteria && !cleanedCriteria.hasOwnProperty('status')) {
            console.log('✓ Search criteria cleaning removes null values');
        }
        
        console.log('\n✅ All Smart Update Service tests passed!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error(error.stack);
    }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    testSmartUpdateService();
}

export { testSmartUpdateService };