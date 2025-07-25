"use client"

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createObject, deleteObject, getInboxObjects, getRecurringObjects, getTodayObjects, getUpcomingObjects, orderObject, updateObject } from "@/actions/objects";
import { CreateObject, Objects, OrderObject } from "@/types/objects";
import { toast } from "sonner";
// import { CheckCircle2 } from "lucide-react";

// Query keys as constants to avoid typos and make refactoring easier
export const QUERY_KEYS = {
  INBOX: ["inbox-objects"],
  TODAY: ["today-objects"],
  UPCOMING: ["upcoming-objects"],
  RECURRING: ["recurring-objects"]
};

// Common queries
export function useInboxObjects() {
  return useQuery({
    queryKey: QUERY_KEYS.INBOX,
    queryFn: getInboxObjects,
  });
}

export function useUpcomingObjects() {
  return useQuery({
    queryKey: QUERY_KEYS.UPCOMING,
    queryFn: getUpcomingObjects,
  });
}

export function useRecurringObjects() {
  return useQuery({
    queryKey: QUERY_KEYS.RECURRING,
    queryFn: getRecurringObjects,
  });
}

export function useTodayObjects() {
  return useQuery({
    queryKey: QUERY_KEYS.TODAY,
    queryFn: getTodayObjects,
  });
}

interface Item {
  _id: string;
  [key: string]: any; // To allow additional properties
}

interface QueryData {
  items?: Item[];
}


// Factory function for creating mutations with shared logic
function CreateObjectMutation<T extends CreateObject | Partial<Objects>>(
  mutationKey: string[],
  mutationFn: (data: T) => Promise<Objects[]>,
  errorMessage: string
) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationKey,
    mutationFn,
    onMutate: async (newData: any) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.INBOX });
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.TODAY });
      
      const previousData = {
        inbox: queryClient.getQueryData(QUERY_KEYS.INBOX),
        today: queryClient.getQueryData(QUERY_KEYS.TODAY)
      };
      
      // Apply optimistic updates to the queries
      const isCreate = mutationKey[0] === "create-object";
      const isDelete = mutationKey[0] === "delete-object";
      
      [QUERY_KEYS.INBOX, QUERY_KEYS.TODAY].forEach(queryKey => {
        queryClient.setQueryData(queryKey, (oldData: QueryData) => {
          if (!oldData) return oldData;

          // Handle array data structure
          if (Array.isArray(oldData)) {
            if (isDelete) {
              // For deletion, filter out the item
              return oldData.filter(item => item._id !== newData._id);
            } else if (isCreate) {
              // For creation, add new item
              return [...oldData, { ...newData, _id: newData._id || `temp-${Date.now()}` }];
            } else {
              // For updates, update existing item
              return oldData.map(item => 
                item._id === newData._id ? { ...item, ...newData } : item
              );
            }
          } 
          // Handle object with items array
          else if (oldData.items && Array.isArray(oldData.items)) {
            return {
              ...oldData,
              items: isDelete
                ? oldData.items.filter(item => item._id !== newData._id)
                : isCreate
                  ? [...oldData.items, { ...newData, _id: newData._id || `temp-${Date.now()}` }]
                  : oldData.items.map(item => 
                      item._id === newData._id ? { ...item, ...newData } : item
                    )
            };
          }
          return oldData;
        });
      });
      
      return previousData;
    },
    onError: (err, _: T, context: any) => {
      if (context) {
        queryClient.setQueryData(QUERY_KEYS.INBOX, context.inbox);
        queryClient.setQueryData(QUERY_KEYS.TODAY, context.today);
      }
      
      toast.error(errorMessage);
      console.error(`${errorMessage}:`, err);
    },
    onSettled: () => {
      // Ensure data consistency after mutation settles
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.INBOX });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TODAY });
    }
  });
}

// Specialized mutation hooks using the factory
export function useCreateObject() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationKey: ["create-object"],
    mutationFn: (object: CreateObject) => createObject(object),
    onMutate: async (newData) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.INBOX });
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.TODAY });
      
      const previousData = {
        inbox: queryClient.getQueryData(QUERY_KEYS.INBOX),
        today: queryClient.getQueryData(QUERY_KEYS.TODAY)
      };
      
      // Apply optimistic updates to the queries
      [QUERY_KEYS.INBOX, QUERY_KEYS.TODAY].forEach(queryKey => {
        queryClient.setQueryData(queryKey, (oldData: QueryData) => {
          if (!oldData) return oldData;

          // Handle array data structure
          if (Array.isArray(oldData)) {
            return [...oldData, { ...newData, _id: `temp-${Date.now()}` }];
          } 
          // Handle object with items array
          else if (oldData.items && Array.isArray(oldData.items)) {
            return {
              ...oldData,
              items: [...oldData.items, { ...newData, _id: `temp-${Date.now()}` }]
            };
          }
          return oldData;
        });
      });
      
      return previousData;
    },
    onSuccess: (_, variables) => {
      // Show success notification in the bottom-right corner
      toast.success(`${variables.title} added to inbox`, {
        position: "bottom-right",
        duration: 3000,
        style: {
          backgroundColor: "white",
          color: "#111",
          padding: "16px",
          borderRadius: "8px",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
          width: "auto",
          maxWidth: "400px"
        }
      });
    },
    onError: (error, _, context) => {
      // Revert to the previous state
      if (context) {
        queryClient.setQueryData(QUERY_KEYS.INBOX, context.inbox);
        queryClient.setQueryData(QUERY_KEYS.TODAY, context.today);
      }
      
      // Show error toast
      toast.error("Failed to create task", {
        position: "bottom-right",
        duration: 4000
      });
      console.error(error);
    },
    onSettled: () => {
      // Refetch to ensure data consistency
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.INBOX });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TODAY });
    }
  });
}

export function useUpdateObject() {
  return CreateObjectMutation<Partial<Objects>>(
    ["update-object"],
    (object) => updateObject(object),
    "Failed to update object"
  );
}

export function useDeleteObject() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationKey: ["delete-object"],
    mutationFn: (object: Partial<Objects>) => deleteObject(object),
    onMutate: async (deletedItem) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.INBOX });
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.TODAY });
      
      const previousData = {
        inbox: queryClient.getQueryData(QUERY_KEYS.INBOX),
        today: queryClient.getQueryData(QUERY_KEYS.TODAY)
      };
      
      // Apply optimistic updates to the queries
      [QUERY_KEYS.INBOX, QUERY_KEYS.TODAY].forEach(queryKey => {
        queryClient.setQueryData(queryKey, (oldData: QueryData) => {
          if (!oldData) return oldData;

          // Handle array data structure
          if (Array.isArray(oldData)) {
            return oldData.filter(item => item._id !== deletedItem._id);
          } 
          // Handle object with items array
          else if (oldData.items && Array.isArray(oldData.items)) {
            return {
              ...oldData,
              items: oldData.items.filter(item => item._id !== deletedItem._id)
            };
          }
          return oldData;
        });
      });
      
      return previousData;
    },
    onSuccess: (_, variables) => {
      console.log('Delete success - variables:', variables);
      
      // Get the title from the variables or use a fallback
      const title = variables.title || 'Object';
   
      // Show success notification in the bottom-right corner when item is deleted
      toast.success(`${title} removed`, {
        position: "bottom-right",
        duration: 3000,
        style: {
          backgroundColor: "white",
          color: "#111",
          padding: "16px",
          borderRadius: "8px",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
          width: "auto",
          maxWidth: "400px"
        }
      });
    },
    onError: (error, _, context) => {
      // Revert to the previous state
      if (context) {
        queryClient.setQueryData(QUERY_KEYS.INBOX, context.inbox);
        queryClient.setQueryData(QUERY_KEYS.TODAY, context.today);
      }
      
      // Show error toast
      toast.error("Failed to delete item", {
        position: "bottom-right",
        duration: 4000
      });
      console.error(error);
    },
    onSettled: () => {
      // Refetch to ensure data consistency
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.INBOX });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TODAY });
    }
  });
}

export function useOrderObject() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationKey: ["order-object"],
    mutationFn: async (object: OrderObject) => {
      const result = await orderObject(object);
      return {
        success: result,
        message: result ? "Order updated" : "Failed to update order"
      };
    },
    onMutate: async (newOrder) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.INBOX });
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.TODAY });
      
      const previousInboxItems = queryClient.getQueryData(QUERY_KEYS.INBOX);
      const previousTodayItems = queryClient.getQueryData(QUERY_KEYS.TODAY);

      // Optimistically update to the new value
      [QUERY_KEYS.INBOX, QUERY_KEYS.TODAY].forEach(key => {
        queryClient.setQueryData(key, (old: Objects[] | undefined) => {
          if (!old) return old;

          // Create a copy of the items
          const updatedItems = [...old];

          // Update the order of each item based on the newOrder
          newOrder.orderedItems.forEach(({ id, order }) => {
            const itemIndex = updatedItems.findIndex(item => item._id === id);
            if (itemIndex !== -1) {
              updatedItems[itemIndex] = {
                ...updatedItems[itemIndex],
                order
              };
            }
          });

          return updatedItems;
        });
      });

      return { previousInboxItems, previousTodayItems };
    },
    onError: (err, _, context: any) => {
      if (context) {
        queryClient.setQueryData(QUERY_KEYS.INBOX, context.previousInboxItems);
        queryClient.setQueryData(QUERY_KEYS.TODAY, context.previousTodayItems);
      }
      toast.error("Failed to reorder items");
      console.error("Failed to reorder items:", err);
    },
    onSettled: () => {
      [QUERY_KEYS.INBOX, QUERY_KEYS.TODAY].forEach(key => {
        queryClient.invalidateQueries({ queryKey: key });
      });
    }
  });
}