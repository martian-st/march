import { VoiceRecognitionService } from './voice-recognition.service.js';

describe('VoiceRecognitionService - Multi-Source Queries', () => {
    let voiceService;

    beforeEach(() => {
        voiceService = new VoiceRecognitionService('test-api-key');
    });

    describe('Source-Aware Voice Processing', () => {
        test('should detect Linear-specific queries', async () => {
            const mockResponse = {
                intent: 'find_objects',
                confidence: 0.9,
                parameters: {
                    query: 'Linear tasks',
                    source_filter: 'linear'
                },
                source_context: {
                    mentioned_platforms: ['linear'],
                    platform_specific: 'true'
                }
            };

            // Mock the AI response
            voiceService.model = {
                generateContent: jest.fn().mockResolvedValue({
                    response: {
                        text: () => JSON.stringify(mockResponse)
                    }
                })
            };

            const result = await voiceService.processVoiceCommand('Do I have any Linear tasks?');
            
            expect(result.success).toBe(true);
            expect(result.intent).toBe('find_objects');
            expect(result.parameters.source_filter).toBe('linear');
            expect(result.sourceContext.mentioned_platforms).toContain('linear');
        });

        test('should detect cross-platform queries', async () => {
            const mockResponse = {
                intent: 'source_query',
                confidence: 0.9,
                parameters: {
                    query: 'all integrations',
                    cross_platform: 'true'
                },
                source_context: {
                    mentioned_platforms: ['linear', 'gmail', 'github'],
                    platform_specific: 'false'
                }
            };

            voiceService.model = {
                generateContent: jest.fn().mockResolvedValue({
                    response: {
                        text: () => JSON.stringify(mockResponse)
                    }
                })
            };

            const result = await voiceService.processVoiceCommand('What\'s new from all my integrations?');
            
            expect(result.success).toBe(true);
            expect(result.intent).toBe('source_query');
            expect(result.parameters.cross_platform).toBe('true');
        });
    });

    describe('Voice Confirmation Processing', () => {
        test('should generate confirmation for bulk operations', () => {
            const data = {
                foundObjects: [{ id: 1 }, { id: 2 }, { id: 3 }],
                operationType: 'delete',
                crossPlatform: true,
                sourceBreakdown: {
                    linear: { count: 2 },
                    gmail: { count: 1 }
                }
            };

            const result = voiceService.generateConfirmationResponse(data, {});
            
            expect(result.needsConfirmation).toBe(true);
            expect(result.text).toContain('3 items to delete');
            expect(result.text).toContain('multiple platforms');
            expect(result.text).toContain('Linear');
            expect(result.text).toContain('Gmail');
        });

        test('should process positive confirmation', () => {
            const confirmationData = {
                operationType: 'update',
                affectedItems: 5,
                pendingOperation: { id: 'test-op' }
            };

            const result = voiceService.processConfirmationResponse('yes, proceed', confirmationData);
            
            expect(result.confirmed).toBe(true);
            expect(result.shouldSpeak).toBe(true);
            expect(result.operationData).toEqual({ id: 'test-op' });
        });

        test('should process negative confirmation', () => {
            const confirmationData = {
                operationType: 'delete',
                affectedItems: 3
            };

            const result = voiceService.processConfirmationResponse('no, cancel', confirmationData);
            
            expect(result.confirmed).toBe(false);
            expect(result.cancelled).toBe(true);
            expect(result.shouldSpeak).toBe(true);
        });

        test('should handle unclear confirmation responses', () => {
            const confirmationData = {
                operationType: 'update',
                affectedItems: 2
            };

            const result = voiceService.processConfirmationResponse('maybe later', confirmationData);
            
            expect(result.confirmed).toBe(null);
            expect(result.needsClarification).toBe(true);
            expect(result.shouldSpeak).toBe(true);
        });
    });

    describe('Source Name Formatting', () => {
        test('should format source names correctly', () => {
            expect(voiceService.formatSourceName('linear')).toBe('Linear');
            expect(voiceService.formatSourceName('gmail')).toBe('Gmail');
            expect(voiceService.formatSourceName('github')).toBe('GitHub');
            expect(voiceService.formatSourceName('twitter')).toBe('Twitter');
            expect(voiceService.formatSourceName('cal')).toBe('Calendar');
            expect(voiceService.formatSourceName('march-ai')).toBe('March AI');
        });
    });

    describe('Audio Summary Generation', () => {
        test('should generate audio summary with source breakdown', () => {
            const results = {
                objects: [
                    { source: 'linear', type: 'task' },
                    { source: 'linear', type: 'task' },
                    { source: 'gmail', type: 'email' }
                ]
            };

            const summary = voiceService.generateAudioSummaryWithSources(results, 'search');
            
            expect(summary).toContain('search completed successfully');
            expect(summary).toContain('3 items were processed');
            expect(summary).toContain('multiple platforms');
            expect(summary).toContain('2 from Linear');
            expect(summary).toContain('1 from Gmail');
        });

        test('should handle single source results', () => {
            const results = {
                objects: [
                    { source: 'github', type: 'issue' },
                    { source: 'github', type: 'issue' }
                ]
            };

            const summary = voiceService.generateAudioSummaryWithSources(results, 'update');
            
            expect(summary).toContain('update completed successfully');
            expect(summary).toContain('2 items were processed');
            expect(summary).toContain('from GitHub');
            expect(summary).not.toContain('multiple platforms');
        });
    });

    describe('Integration Error Recovery', () => {
        test('should generate recovery options with alternatives', () => {
            const context = {
                integration: 'linear',
                operation: 'search',
                alternativeSources: ['github', 'march']
            };

            const result = voiceService.generateIntegrationErrorRecovery(new Error('Connection failed'), context);
            
            expect(result.needsRecoveryChoice).toBe(true);
            expect(result.text).toContain('trouble with Linear');
            expect(result.text).toContain('GitHub or March');
            expect(result.recoveryOptions.alternativeSources).toEqual(['github', 'march']);
        });

        test('should process recovery choice for alternatives', () => {
            const recoveryOptions = {
                integration: 'linear',
                alternativeSources: ['github', 'march']
            };

            const result = voiceService.processRecoveryChoice('yes, use alternatives', recoveryOptions);
            
            expect(result.choice).toBe('use_alternatives');
            expect(result.alternatives).toEqual(['github', 'march']);
            expect(result.shouldSpeak).toBe(true);
        });

        test('should process recovery choice for retry', () => {
            const recoveryOptions = {
                integration: 'gmail',
                alternativeSources: []
            };

            const result = voiceService.processRecoveryChoice('retry the connection', recoveryOptions);
            
            expect(result.choice).toBe('retry');
            expect(result.integration).toBe('gmail');
            expect(result.shouldSpeak).toBe(true);
        });
    });
});