import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

const getTaskWhereOwner = async (taskId: string, userId: string) => {
  return prisma.task.findFirst({
    where: {
      id: taskId,
      project: {
        ownerId: userId,
      },
    },
    include: {
      project: true,
      assignee: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
};

export const getTasksByProject = async (req: Request, res: Response) => {
  const projectId = String(req.params.projectId);

  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return res.status(404).json({ message: 'No se encontró el proyecto.' });
    }

    if (project.ownerId !== req.user!.id) {
      return res.status(403).json({ message: 'No tienes permiso para acceder a este proyecto.' });
    }

    const tasks = await prisma.task.findMany({
      where: { projectId },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return res.status(200).json({ tasks });
  } catch (error) {
    return res.status(500).json({ message: 'No se pudieron cargar las tareas.' });
  }
};

export const createTask = async (req: Request, res: Response) => {
  const projectId = String(req.params.projectId);
  const { title, description, priority, status, dueDate } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ message: 'El título de la tarea es obligatorio.' });
  }

  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return res.status(404).json({ message: 'No se encontró el proyecto.' });
    }

    if (project.ownerId !== req.user!.id) {
      return res.status(403).json({ message: 'No tienes permiso para añadir tareas a este proyecto.' });
    }

    const task = await prisma.task.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        priority: priority || 'MEDIUM',
        status: status || 'TODO',
        dueDate: dueDate ? new Date(dueDate) : null,
        projectId,
      },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return res.status(201).json({ task });
  } catch (error) {
    return res.status(500).json({ message: 'No se pudo crear la tarea.' });
  }
};

export const updateTask = async (req: Request, res: Response) => {
  const taskId = String(req.params.id);
  const { title, description, priority, status, dueDate } = req.body;

  try {
    const task = await getTaskWhereOwner(taskId, req.user!.id);

    if (!task) {
      return res.status(404).json({ message: 'No se encontró la tarea.' });
    }

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        title: title !== undefined ? title.trim() : task.title,
        description: description !== undefined ? description.trim() || null : task.description,
        priority: priority || task.priority,
        status: status || task.status,
        dueDate: dueDate !== undefined ? dueDate ? new Date(dueDate) : null : task.dueDate,
      },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return res.status(200).json({ task: updatedTask });
  } catch (error) {
    return res.status(500).json({ message: 'No se pudo actualizar la tarea.' });
  }
};

export const deleteTask = async (req: Request, res: Response) => {
  const taskId = String(req.params.id);

  try {
    const task = await getTaskWhereOwner(taskId, req.user!.id);

    if (!task) {
      return res.status(404).json({ message: 'No se encontró la tarea.' });
    }

    await prisma.task.delete({
      where: { id: taskId },
    });

    return res.status(200).json({ message: 'La tarea se eliminó correctamente.' });
  } catch (error) {
    return res.status(500).json({ message: 'No se pudo eliminar la tarea.' });
  }
};
