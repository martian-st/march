"use server"

import { apiClient } from "@/lib/api"
import { CreateObject, DeleteResponse, Objects, ObjectsResponse, OrderObject, OrderResponse, TodayObjectResponse } from "@/types/objects"

export interface UpcomingObjectResponse {
  objects: Objects[]
}

export const getInboxObjects = async (): Promise<Objects[]> => {
  const data = await apiClient.get<ObjectsResponse>('/api/inbox')
  return data.response
}

export const getTodayObjects = async (): Promise<{ todayObjects: Objects[], overdueObjects: Objects[] }> => {
  const data = await apiClient.get<TodayObjectResponse>('/api/today')

  return {
    todayObjects: data.response.todayObjects || [],
    overdueObjects: data.response.overdueObjects || []
  }
}

export const createObject = async (object: CreateObject) => {
  const data = await apiClient.post<ObjectsResponse, CreateObject>('/api/inbox', object)
  return data.response
}

export const updateObject = async (object: Partial<Objects>) => {
  const data = await apiClient.put<ObjectsResponse, Partial<Objects>>(`/api/inbox/${object._id}`, object)
  return data.response
}

export const deleteObject = async (object: Partial<Objects>) => {
  const data = await apiClient.delete<DeleteResponse>(`/api/inbox/${object._id}`)
  return data.success
}

export const orderObject = async (object: OrderObject) => {
  const data = await apiClient.put<OrderResponse, OrderObject>('/api/reorder', object)
  return data.success
}

export const getUpcomingObjects = async (): Promise<Objects[]> => {
  const data = await apiClient.get<UpcomingObjectResponse>('/api/upcoming')
  return data.objects
}

export interface RecurringObjectResponse {
  objects: Objects[]
}

export const getRecurringObjects = async (): Promise<Objects[]> => {
  try {
    console.log('Recurrence API called');
    // Make sure we're using the correct API endpoint path
    const data = await apiClient.get<RecurringObjectResponse>('/api/recurrence/')
    
    // Handle the case where the response structure might be different
    if (data && data.objects) {
      return data.objects
    } else if (Array.isArray(data)) {
      return data
    } else if (typeof data === 'object' && data !== null) {
      // Try to find objects in the response
      const possibleObjects = Object.values(data).find(Array.isArray)
      return Array.isArray(possibleObjects) ? possibleObjects : []
    }
    return []
  } catch (error) {
    console.error('Error fetching recurring objects:', error)
    return []
  }
}
