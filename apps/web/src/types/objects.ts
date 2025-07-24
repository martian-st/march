interface Cycle {
  startsAt: Date | null;
  endsAt: Date | null;
}

interface Metadata {
  createdByAI: boolean;
  originalQuery: string;
  url: string
  createdAt: string;
  receivedAt: string
}

interface Objects {
  _id: string;
  uuid: string;
  title: string;
  description: string;
  order: number,
  type: 'todo'; 
  source: string;
  icon: string;
  cover_image: string;
  
  completedAt: Date | null;
  createdAt: string;
  updatedAt: string;
  
  // Status fields
  status: string | null;
  isCompleted: boolean;
  isArchived: boolean;
  isDeleted: boolean;
  isFavorite: boolean;
  
  
  // New structured due object
  due?: {
    date: string | null;
    is_recurring: boolean;
    lang: string;
    string: string | null;
    timezone: string;
  } | null;
  
  // Nested objects
  cycle: Cycle;
  metadata: Metadata;
  
  // Arrays
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  arrays: any[]; 
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  blocks: any[]; 
  labels: string[];
  
  // Reference fields
  user: string; 
}

interface ObjectsResponse {
  response: Objects[]
}

interface TodayObjectResponse {
  response: {
    todayObjects: Objects[],
    overdueObjects?: Objects[]
  }
}

interface CreateObject {
  title: string,
  dueDate?: string | null,
  isCompleted?: boolean,
}

interface OrderObject {
  orderedItems: {
    id: string,
    order: number
  }[]
}

interface OrderObjectRequest {
  orderedItems: OrderObject[]
}

interface SortableObject {
  id?: string;
  type: string;
  text: string;
  checked: boolean;
}

interface OrderResponse {
    success: boolean;
    message: string;
}

interface DeleteResponse {
  success: boolean;
  message: string;
}

interface WebSocketMessage {
  type: "linear" | string
  action: "create" | "update" | "delete" | "unassigned"
  item: Objects 
}

export type { Objects, WebSocketMessage, OrderObject, OrderObjectRequest, OrderResponse, ObjectsResponse, TodayObjectResponse, CreateObject, SortableObject, DeleteResponse };