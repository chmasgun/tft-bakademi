import axios from 'axios';

// In development, use relative paths. In production, Vercel handles /api routes automatically
const API_BASE_URL = import.meta.env.DEV ? '/api' : '/api';

export type CompositionTier = 'S' | 'A' | 'B' | 'C' | 'X';

export interface TeamComposition {
  _id?: string;
  name: string;
  description?: string;
  tier?: CompositionTier; // S, A, B, C, or X (situational)
  board: (BoardChampion | null)[][];
  championImages?: string[]; // Array of champion apiNames to use as composition images
  createdAt?: Date;
  updatedAt?: Date;
}

export interface BoardChampion {
  champion: {
    apiName: string;
    name: string;
    cost: number;
    icon: string;
    traits: string[];
  };
  items: Array<{
    apiName: string;
    name: string;
    icon: string;
  }>;
  starLevel: number;
}

/**
 * Fetch all saved compositions
 */
export const fetchCompositions = async (): Promise<TeamComposition[]> => {
  try {
    const response = await axios.get<TeamComposition[]>(`${API_BASE_URL}/compositions`);
    return response.data;
  } catch (error) {
    console.error('Error fetching compositions:', error);
    throw error;
  }
};

/**
 * Fetch a single composition by ID
 */
export const fetchComposition = async (id: string): Promise<TeamComposition> => {
  try {
    const response = await axios.get<TeamComposition>(`${API_BASE_URL}/compositions/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching composition:', error);
    throw error;
  }
};

/**
 * Save a new composition
 */
export const saveComposition = async (composition: Omit<TeamComposition, '_id' | 'createdAt' | 'updatedAt'>): Promise<TeamComposition> => {
  try {
    const response = await axios.post<TeamComposition>(`${API_BASE_URL}/compositions`, composition);
    return response.data;
  } catch (error) {
    console.error('Error saving composition:', error);
    throw error;
  }
};

/**
 * Update an existing composition
 */
export const updateComposition = async (id: string, composition: Partial<TeamComposition>): Promise<TeamComposition> => {
  try {
    const response = await axios.put<TeamComposition>(`${API_BASE_URL}/compositions/${id}`, composition);
    return response.data;
  } catch (error) {
    console.error('Error updating composition:', error);
    throw error;
  }
};

/**
 * Delete a composition
 */
export const deleteComposition = async (id: string): Promise<void> => {
  try {
    await axios.delete(`${API_BASE_URL}/compositions/${id}`);
  } catch (error) {
    console.error('Error deleting composition:', error);
    throw error;
  }
};
