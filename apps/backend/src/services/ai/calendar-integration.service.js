import { GoogleGenerativeAI } from "@google/generative-ai";
import { Object } from "../../models/lib/object.model.js";
import { saveContent } from "../../utils/helper.service.js";

/**
 * Calendar Integration Service
 * Handles calendar invitations, meeting creation, and scheduling
 */
export class CalendarIntegrationService {
    constructor(apiKey) {
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({
            model: "gemini-1.5-flash",
            generationConfig: {
                temperature: 0.2,
                topP: 0.8,
                topK: 40,
                maxOutputTokens: 2048
            }
        });
    }

    /**
     * Parse natural language for calendar event creation
     */
    async parseCalendarRequest(userPrompt, userId) {
        const parsePrompt = `
        Parse this calendar/meeting request: "${userPrompt}"
        
        Extract the following information and return as JSON:
        {
            "title": "meeting title",
            "description": "meeting description",
            "date": "ISO date string",
            "time": "time in HH:MM format",
            "duration": "duration in minutes",
            "attendees": ["list of attendee emails or names"],
            "location": "meeting location or 'online'",
            "recurring": {
                "isRecurring": boolean,
                "frequency": "daily|weekly|monthly",
                "endDate": "ISO date string if specified"
            },
            "priority": "high|medium|low",
            "type": "meeting|call|appointment|reminder",
            "timezone": "user timezone if mentioned",
            "confidence": 0.95
        }
        
        Examples:
        "Schedule a team meeting tomorrow at 2pm" -> date: tomorrow, time: "14:00", title: "Team meeting"
        "Book a doctor appointment next Friday at 10am" -> date: next Friday, time: "10:00", title: "Doctor appointment"
        "Create a recurring standup every Monday at 9am" -> recurring: true, frequency: "weekly"
        `;

        try {
            const result = await this.model.generateContent(parsePrompt);
            const response = result.response.text();
            return JSON.parse(response.replace(/```json\n?|\n?```/g, ''));
        } catch (error) {
            console.error("Error parsing calendar request:", error);
            return this.getDefaultCalendarData(userPrompt);
        }
    }

    /**
     * Create calendar event/meeting object
     */
    async createCalendarEvent(calendarData, userId) {
        try {
            // Validate and process the calendar data
            const processedData = await this.processCalendarData(calendarData, userId);
            
            // Create the meeting object
            const meetingObject = await Object.create({
                user: userId,
                title: processedData.title,
                description: processedData.description,
                type: processedData.type || "meeting",
                status: "null",
                due: {
                    date: processedData.dateTime,
                    string: processedData.dateString,
                    timezone: processedData.timezone || "UTC"
                },
                metadata: {
                    calendar: true,
                    attendees: processedData.attendees || [],
                    location: processedData.location || "",
                    duration: processedData.duration || 60,
                    meetingType: processedData.meetingType || "in-person",
                    priority: processedData.priority || "medium",
                    recurring: processedData.recurring || { isRecurring: false }
                },
                source: "march"
            });

            // Save to search index
            await saveContent(meetingObject);

            // Generate calendar invitation if needed
            const invitation = await this.generateCalendarInvitation(meetingObject);

            return {
                meeting: meetingObject,
                invitation,
                success: true,
                message: `Created ${processedData.type}: ${processedData.title}`
            };

        } catch (error) {
            console.error("Error creating calendar event:", error);
            throw error;
        }
    }

    /**
     * Process and validate calendar data
     */
    async processCalendarData(calendarData, userId) {
        // Process date and time
        const dateTime = this.processDateTime(calendarData.date, calendarData.time);
        const dateString = this.generateDateString(dateTime);

        // Process attendees
        const attendees = this.processAttendees(calendarData.attendees || []);

        // Determine meeting type based on location
        const meetingType = this.determineMeetingType(calendarData.location);

        return {
            title: calendarData.title || "New Meeting",
            description: calendarData.description || "",
            type: calendarData.type || "meeting",
            dateTime: dateTime.toISOString(),
            dateString,
            timezone: calendarData.timezone || "UTC",
            attendees,
            location: calendarData.location || "",
            duration: calendarData.duration || 60,
            meetingType,
            priority: calendarData.priority || "medium",
            recurring: calendarData.recurring || { isRecurring: false }
        };
    }

    /**
     * Process date and time strings into Date object
     */
    processDateTime(dateStr, timeStr) {
        try {
            let date;
            
            // Handle relative dates
            if (dateStr.includes("today")) {
                date = new Date();
            } else if (dateStr.includes("tomorrow")) {
                date = new Date();
                date.setDate(date.getDate() + 1);
            } else if (dateStr.includes("next week")) {
                date = new Date();
                date.setDate(date.getDate() + 7);
            } else {
                date = new Date(dateStr);
            }

            // Handle time
            if (timeStr) {
                const [hours, minutes] = timeStr.split(':').map(Number);
                date.setHours(hours, minutes || 0, 0, 0);
            }

            return date;
        } catch (error) {
            console.error("Error processing date/time:", error);
            // Default to tomorrow at 10 AM
            const defaultDate = new Date();
            defaultDate.setDate(defaultDate.getDate() + 1);
            defaultDate.setHours(10, 0, 0, 0);
            return defaultDate;
        }
    }

    /**
     * Generate human-readable date string
     */
    generateDateString(dateTime) {
        const options = {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        return dateTime.toLocaleDateString('en-US', options);
    }

    /**
     * Process attendees list
     */
    processAttendees(attendees) {
        return attendees.map(attendee => {
            if (typeof attendee === 'string') {
                // Check if it's an email
                if (attendee.includes('@')) {
                    return { email: attendee, name: attendee.split('@')[0] };
                }
                return { name: attendee, email: null };
            }
            return attendee;
        });
    }

    /**
     * Determine meeting type based on location
     */
    determineMeetingType(location) {
        if (!location) return "in-person";
        
        const onlineKeywords = ["zoom", "meet", "teams", "online", "virtual", "remote"];
        const locationLower = location.toLowerCase();
        
        return onlineKeywords.some(keyword => locationLower.includes(keyword)) 
            ? "online" 
            : "in-person";
    }

    /**
     * Generate calendar invitation text
     */
    async generateCalendarInvitation(meetingObject) {
        const invitationPrompt = `
        Generate a professional calendar invitation for this meeting:
        
        Title: ${meetingObject.title}
        Description: ${meetingObject.description}
        Date: ${meetingObject.due.string}
        Location: ${meetingObject.metadata.location}
        Duration: ${meetingObject.metadata.duration} minutes
        Attendees: ${meetingObject.metadata.attendees.map(a => a.name || a.email).join(', ')}
        
        Create a professional invitation email that includes:
        - Clear subject line
        - Meeting details
        - Agenda (if description provided)
        - Join instructions (if online)
        - RSVP request
        `;

        try {
            const result = await this.model.generateContent(invitationPrompt);
            return result.response.text();
        } catch (error) {
            console.error("Error generating invitation:", error);
            return this.getDefaultInvitation(meetingObject);
        }
    }

    /**
     * Find available time slots
     */
    async findAvailableSlots(userId, date, duration = 60, preferences = {}) {
        try {
            // Get existing meetings for the date
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);
            
            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);

            const existingMeetings = await Object.find({
                user: userId,
                type: "meeting",
                "due.date": {
                    $gte: startOfDay.toISOString(),
                    $lte: endOfDay.toISOString()
                },
                isDeleted: false
            }).sort({ "due.date": 1 });

            // Generate available slots
            const workStart = preferences.workStart || 9; // 9 AM
            const workEnd = preferences.workEnd || 17; // 5 PM
            const slotDuration = duration;
            const availableSlots = [];

            for (let hour = workStart; hour < workEnd; hour++) {
                for (let minute = 0; minute < 60; minute += 30) {
                    const slotStart = new Date(date);
                    slotStart.setHours(hour, minute, 0, 0);
                    
                    const slotEnd = new Date(slotStart);
                    slotEnd.setMinutes(slotEnd.getMinutes() + slotDuration);

                    // Check if slot conflicts with existing meetings
                    const hasConflict = existingMeetings.some(meeting => {
                        const meetingStart = new Date(meeting.due.date);
                        const meetingEnd = new Date(meetingStart);
                        meetingEnd.setMinutes(meetingEnd.getMinutes() + (meeting.metadata.duration || 60));

                        return (slotStart < meetingEnd && slotEnd > meetingStart);
                    });

                    if (!hasConflict && slotEnd.getHours() <= workEnd) {
                        availableSlots.push({
                            start: slotStart.toISOString(),
                            end: slotEnd.toISOString(),
                            startTime: slotStart.toLocaleTimeString('en-US', { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                            }),
                            endTime: slotEnd.toLocaleTimeString('en-US', { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                            })
                        });
                    }
                }
            }

            return availableSlots.slice(0, 10); // Return top 10 slots
        } catch (error) {
            console.error("Error finding available slots:", error);
            return [];
        }
    }

    /**
     * Suggest optimal meeting times
     */
    async suggestMeetingTimes(userPrompt, userId, preferences = {}) {
        try {
            // Parse the request for time preferences
            const timePreferences = await this.parseTimePreferences(userPrompt);
            
            // Find available slots for the next 7 days
            const suggestions = [];
            const today = new Date();
            
            for (let i = 0; i < 7; i++) {
                const checkDate = new Date(today);
                checkDate.setDate(checkDate.getDate() + i);
                
                const slots = await this.findAvailableSlots(
                    userId, 
                    checkDate, 
                    timePreferences.duration || 60,
                    preferences
                );
                
                if (slots.length > 0) {
                    suggestions.push({
                        date: checkDate.toDateString(),
                        slots: slots.slice(0, 3) // Top 3 slots per day
                    });
                }
            }

            return {
                suggestions,
                preferences: timePreferences,
                message: `Found ${suggestions.length} days with available time slots`
            };
        } catch (error) {
            console.error("Error suggesting meeting times:", error);
            return { suggestions: [], message: "Unable to find available times" };
        }
    }

    /**
     * Parse time preferences from natural language
     */
    async parseTimePreferences(userPrompt) {
        const parsePrompt = `
        Extract time preferences from: "${userPrompt}"
        
        Return JSON:
        {
            "preferredTimes": ["morning", "afternoon", "evening"],
            "duration": 60,
            "daysOfWeek": ["monday", "tuesday", "wednesday", "thursday", "friday"],
            "timeRange": {
                "start": "09:00",
                "end": "17:00"
            },
            "urgency": "high|medium|low"
        }`;

        try {
            const result = await this.model.generateContent(parsePrompt);
            const response = result.response.text();
            return JSON.parse(response.replace(/```json\n?|\n?```/g, ''));
        } catch (error) {
            return {
                preferredTimes: ["morning", "afternoon"],
                duration: 60,
                daysOfWeek: ["monday", "tuesday", "wednesday", "thursday", "friday"],
                timeRange: { start: "09:00", end: "17:00" },
                urgency: "medium"
            };
        }
    }

    /**
     * Get default calendar data for fallback
     */
    getDefaultCalendarData(userPrompt) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(10, 0, 0, 0);

        return {
            title: "New Meeting",
            description: `Meeting created from: ${userPrompt}`,
            date: tomorrow.toISOString(),
            time: "10:00",
            duration: 60,
            attendees: [],
            location: "",
            recurring: { isRecurring: false },
            priority: "medium",
            type: "meeting",
            confidence: 0.5
        };
    }

    /**
     * Get default invitation text
     */
    getDefaultInvitation(meetingObject) {
        return `
Subject: Meeting Invitation: ${meetingObject.title}

You are invited to attend:

Meeting: ${meetingObject.title}
Date & Time: ${meetingObject.due.string}
Location: ${meetingObject.metadata.location || "TBD"}
Duration: ${meetingObject.metadata.duration} minutes

${meetingObject.description ? `Description:\n${meetingObject.description}\n` : ''}

Please confirm your attendance.

Best regards,
March Assistant
        `.trim();
    }
}
