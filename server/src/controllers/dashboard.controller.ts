import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

export const getDashboardSummary = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const projects = await prisma.project.findMany({
      where: { ownerId: userId },
      include: {
        tasks: true,
      },
    });

    const totalProjects = projects.length;
    const totalTasks = projects.reduce((sum, project) => sum + project.tasks.length, 0);

    const completedTasks = projects.reduce(
      (sum, project) =>
        sum + project.tasks.filter((task) => task.status === 'DONE').length,
      0,
    );

    const inProgressTasks = projects.reduce(
      (sum, project) =>
        sum + project.tasks.filter((task) => task.status === 'IN_PROGRESS').length,
      0,
    );

    const todoTasks = projects.reduce(
      (sum, project) =>
        sum + project.tasks.filter((task) => task.status === 'TODO').length,
      0,
    );

    const completionRate = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

    const recentTasks = await prisma.task.findMany({
      where: {
        project: {
          ownerId: userId,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 5,
      include: {
        project: true,
      },
    });

    return res.status(200).json({
      summary: {
        totalProjects,
        totalTasks,
        completedTasks,
        inProgressTasks,
        todoTasks,
        completionRate,
      },
      recentTasks,
    });
  } catch (error) {
    return res.status(500).json({ message: 'No se pudo cargar el resumen del panel.' });
  }
};
