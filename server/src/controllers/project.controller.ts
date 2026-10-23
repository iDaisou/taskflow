import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

export const getProjects = async (req: Request, res: Response) => {
  try {
    const projects = await prisma.project.findMany({
      where: {
        ownerId: req.user!.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return res.status(200).json({ projects });
  } catch (error) {
    return res.status(500).json({ message: 'No se pudieron cargar los proyectos.' });
  }
};

export const getProjectById = async (req: Request, res: Response) => {
  const id = String(req.params.id);

  try {
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        tasks: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!project) {
      return res.status(404).json({ message: 'No se encontró el proyecto.' });
    }

    if (project.ownerId !== req.user!.id) {
      return res.status(403).json({ message: 'No tienes permiso para acceder a este proyecto.' });
    }

    return res.status(200).json({ project });
  } catch (error) {
    return res.status(500).json({ message: 'No se pudo cargar el proyecto.' });
  }
};

export const createProject = async (req: Request, res: Response) => {
  const { name, description } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ message: 'El nombre del proyecto es obligatorio.' });
  }

  try {
    const project = await prisma.project.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        ownerId: req.user!.id,
      },
    });

    return res.status(201).json({ project });
  } catch (error) {
    return res.status(500).json({ message: 'No se pudo crear el proyecto.' });
  }
};

export const updateProject = async (req: Request, res: Response) => {
  const id = String(req.params.id);
  const { name, description } = req.body;

  try {
    const existingProject = await prisma.project.findUnique({
      where: { id },
    });

    if (!existingProject) {
      return res.status(404).json({ message: 'No se encontró el proyecto.' });
    }

    if (existingProject.ownerId !== req.user!.id) {
      return res.status(403).json({ message: 'No tienes permiso para actualizar este proyecto.' });
    }

    const updatedProject = await prisma.project.update({
      where: { id },
      data: {
        name: name ? name.trim() : existingProject.name,
        description: description !== undefined ? description.trim() || null : existingProject.description,
      },
    });

    return res.status(200).json({ project: updatedProject });
  } catch (error) {
    return res.status(500).json({ message: 'No se pudo actualizar el proyecto.' });
  }
};

export const deleteProject = async (req: Request, res: Response) => {
  const id = String(req.params.id);

  try {
    const project = await prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      return res.status(404).json({ message: 'No se encontró el proyecto.' });
    }

    if (project.ownerId !== req.user!.id) {
      return res.status(403).json({ message: 'No tienes permiso para eliminar este proyecto.' });
    }

    await prisma.$transaction([
      prisma.task.deleteMany({ where: { projectId: id } }),
      prisma.project.delete({ where: { id } }),
    ]);

    return res.status(200).json({ message: 'El proyecto se eliminó correctamente.' });
  } catch (error) {
    return res.status(500).json({ message: 'No se pudo eliminar el proyecto.' });
  }
};
