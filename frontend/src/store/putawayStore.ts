import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { PutawayTask, PutawayStatus } from '../types';
import putawayService, {
  CreatePutawayTaskInput,
  CompletePutawayTaskInput,
  PutawayQueryParams,
} from '../services/putaway.service';

// ==========================================
// PUTAWAY STORE
// ==========================================

interface PutawayState {
  tasks: PutawayTask[];
  currentTask: PutawayTask | null;
  totalCount: number;
  currentPage: number;
  pageSize: number;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchTasks: (params: PutawayQueryParams) => Promise<void>;
  fetchTaskById: (id: string) => Promise<void>;
  fetchTaskByNumber: (taskNumber: string) => Promise<void>;
  createTask: (data: CreatePutawayTaskInput) => Promise<PutawayTask>;
  assignTask: (id: string, operatorUserId: string) => Promise<void>;
  startTask: (id: string, destinationLocationId?: string) => Promise<void>;
  completeTask: (id: string, data: CompletePutawayTaskInput) => Promise<void>;
  cancelTask: (id: string, reason?: string) => Promise<void>;
  putOnHold: (id: string, reason?: string) => Promise<void>;
  resumeTask: (id: string) => Promise<void>;
  fetchOperatorTasks: (operatorUserId: string, status?: PutawayStatus) => Promise<void>;
  fetchPendingTasks: (warehouseId?: string) => Promise<void>;
  setCurrentTask: (task: PutawayTask | null) => void;
  clearError: () => void;
}

export const usePutawayStore = create<PutawayState>()(
  devtools(
    (set, get) => ({
      tasks: [],
      currentTask: null,
      totalCount: 0,
      currentPage: 1,
      pageSize: 20,
      isLoading: false,
      error: null,

      // Fetch all tasks with filters
      fetchTasks: async (params: PutawayQueryParams) => {
        set({ isLoading: true, error: null });

        try {
          const response = await putawayService.getPutawayTasks(params);
          set({
            tasks: response.data,
            totalCount: response.pagination.total,
            currentPage: response.pagination.page,
            pageSize: response.pagination.limit,
            isLoading: false,
          });
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.error || 'Failed to fetch putaway tasks',
          });
          throw error;
        }
      },

      // Fetch task by ID
      fetchTaskById: async (id: string) => {
        set({ isLoading: true, error: null });

        try {
          const task = await putawayService.getPutawayTaskById(id);
          set({
            currentTask: task,
            isLoading: false,
          });
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.error || 'Failed to fetch putaway task',
          });
          throw error;
        }
      },

      // Fetch task by number
      fetchTaskByNumber: async (taskNumber: string) => {
        set({ isLoading: true, error: null });

        try {
          const task = await putawayService.getPutawayTaskByNumber(taskNumber);
          set({
            currentTask: task,
            isLoading: false,
          });
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.error || 'Failed to fetch putaway task',
          });
          throw error;
        }
      },

      // Create new task
      createTask: async (data: CreatePutawayTaskInput) => {
        set({ isLoading: true, error: null });

        try {
          const task = await putawayService.createPutawayTask(data);
          set((state) => ({
            tasks: [task, ...state.tasks],
            isLoading: false,
          }));
          return task;
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.error || 'Failed to create putaway task',
          });
          throw error;
        }
      },

      // Assign task to operator
      assignTask: async (id: string, operatorUserId: string) => {
        set({ isLoading: true, error: null });

        try {
          const updatedTask = await putawayService.assignTask(id, { operatorUserId });
          set((state) => ({
            tasks: state.tasks.map((t) => (t.id === id ? updatedTask : t)),
            currentTask: state.currentTask?.id === id ? updatedTask : state.currentTask,
            isLoading: false,
          }));
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.error || 'Failed to assign task',
          });
          throw error;
        }
      },

      // Start task
      startTask: async (id: string, destinationLocationId?: string) => {
        set({ isLoading: true, error: null });

        try {
          const updatedTask = await putawayService.startTask(id, { destinationLocationId });
          set((state) => ({
            tasks: state.tasks.map((t) => (t.id === id ? updatedTask : t)),
            currentTask: state.currentTask?.id === id ? updatedTask : state.currentTask,
            isLoading: false,
          }));
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.error || 'Failed to start task',
          });
          throw error;
        }
      },

      // Complete task
      completeTask: async (id: string, data: CompletePutawayTaskInput) => {
        set({ isLoading: true, error: null });

        try {
          const updatedTask = await putawayService.completeTask(id, data);
          set((state) => ({
            tasks: state.tasks.map((t) => (t.id === id ? updatedTask : t)),
            currentTask: state.currentTask?.id === id ? updatedTask : state.currentTask,
            isLoading: false,
          }));
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.error || 'Failed to complete task',
          });
          throw error;
        }
      },

      // Cancel task
      cancelTask: async (id: string, reason?: string) => {
        set({ isLoading: true, error: null });

        try {
          const updatedTask = await putawayService.cancelTask(id, reason);
          set((state) => ({
            tasks: state.tasks.map((t) => (t.id === id ? updatedTask : t)),
            currentTask: state.currentTask?.id === id ? updatedTask : state.currentTask,
            isLoading: false,
          }));
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.error || 'Failed to cancel task',
          });
          throw error;
        }
      },

      // Put task on hold
      putOnHold: async (id: string, reason?: string) => {
        set({ isLoading: true, error: null });

        try {
          const updatedTask = await putawayService.putOnHold(id, reason);
          set((state) => ({
            tasks: state.tasks.map((t) => (t.id === id ? updatedTask : t)),
            currentTask: state.currentTask?.id === id ? updatedTask : state.currentTask,
            isLoading: false,
          }));
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.error || 'Failed to put task on hold',
          });
          throw error;
        }
      },

      // Resume task
      resumeTask: async (id: string) => {
        set({ isLoading: true, error: null });

        try {
          const updatedTask = await putawayService.resumeTask(id);
          set((state) => ({
            tasks: state.tasks.map((t) => (t.id === id ? updatedTask : t)),
            currentTask: state.currentTask?.id === id ? updatedTask : state.currentTask,
            isLoading: false,
          }));
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.error || 'Failed to resume task',
          });
          throw error;
        }
      },

      // Fetch operator's tasks
      fetchOperatorTasks: async (operatorUserId: string, status?: PutawayStatus) => {
        set({ isLoading: true, error: null });

        try {
          const tasks = await putawayService.getOperatorTasks(operatorUserId, status);
          set({
            tasks,
            isLoading: false,
          });
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.error || 'Failed to fetch operator tasks',
          });
          throw error;
        }
      },

      // Fetch pending tasks
      fetchPendingTasks: async (warehouseId?: string) => {
        set({ isLoading: true, error: null });

        try {
          const tasks = await putawayService.getPendingTasks(warehouseId);
          set({
            tasks,
            isLoading: false,
          });
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.error || 'Failed to fetch pending tasks',
          });
          throw error;
        }
      },

      // Set current task
      setCurrentTask: (task: PutawayTask | null) => set({ currentTask: task }),

      // Clear error
      clearError: () => set({ error: null }),
    }),
    { name: 'PutawayStore' }
  )
);
