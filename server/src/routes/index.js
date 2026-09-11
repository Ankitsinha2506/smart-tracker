import { Router } from 'express';
import { authRouter } from './auth.routes.js';
import { studentRouter } from './student.routes.js';
import { technologyRouter } from './technology.routes.js';
import { historyRouter } from './history.routes.js';
import { dashboardRouter } from './dashboard.routes.js';
import { reportRouter } from './report.routes.js';

export const apiRouter = Router();

apiRouter.get('/health', (_request, response) => {
  response.status(200).json({
    success: true,
    message: 'SmartApply API is healthy',
    data: { timestamp: new Date().toISOString() },
  });
});

apiRouter.use('/auth', authRouter);
apiRouter.use('/students', studentRouter);
apiRouter.use('/technologies', technologyRouter);
apiRouter.use('/application-history', historyRouter);
apiRouter.use('/dashboard', dashboardRouter);
apiRouter.use('/reports', reportRouter);
