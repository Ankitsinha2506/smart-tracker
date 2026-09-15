const admin = {
  _id: '507f1f77bcf86cd799439001',
  name: 'Placement Admin',
  email: 'admin@example.com',
  role: 'admin',
  status: 'active',
};
const studentUser = {
  _id: '507f1f77bcf86cd799439002',
  name: 'Asha Patil',
  email: 'asha@example.com',
  role: 'student',
  status: 'active',
  student: '507f1f77bcf86cd799439011',
};
const technology = {
  _id: '507f1f77bcf86cd799439021',
  name: 'MERN Stack',
  slug: 'mern-stack',
  isActive: true,
  description: 'MongoDB, Express, React, and Node',
};
const student = {
  _id: '507f1f77bcf86cd799439011',
  candidateName: 'Asha Patil',
  mobileNumber: '+919876543210',
  personalEmail: 'asha@example.com',
  city: 'Pune',
  collegeName: 'Smart College',
  batch: '2026-A',
  trainerName: 'Rahul Sharma',
  technology,
  naukriEmail: 'asha.jobs@example.com',
  membershipType: 'paid',
  currentTotalApplicationCount: 905,
  previousDayApplicationCount: 900,
  todayApplicationCount: 5,
  status: 'active',
  lastApplicationUpdateDate: '2026-08-10T09:00:00.000Z',
};
const history = {
  _id: '507f1f77bcf86cd799439031',
  student,
  applicationDate: '2026-08-10T00:00:00.000Z',
  previousCount: 900,
  currentCount: 905,
  dailyCount: 5,
  source: 'student',
  note: 'Morning update',
};
const success = (data, message = 'Success', meta) => ({
  success: true,
  message,
  data,
  ...(meta && { meta }),
});

export async function mockApi(page, { initialRole = null } = {}) {
  let role = initialRole;
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace(/^.*\/api\/v1/, '');
    const method = request.method();
    const user = role === 'student' ? studentUser : { ...admin, role: role || 'admin' };
    const json = (body, status = 200, headers = {}) =>
      route.fulfill({
        status,
        contentType: 'application/json',
        headers,
        body: JSON.stringify(body),
      });

    if (path === '/auth/refresh')
      return role
        ? json(success({ user, accessToken: 'mock-access-token' }))
        : json({ success: false, message: 'No session' }, 401);
    if (path === '/auth/login' && method === 'POST') {
      const body = request.postDataJSON();
      role = body.email.startsWith('student') ? 'student' : 'admin';
      const loginUser = role === 'student' ? studentUser : admin;
      return json(
        success({ user: loginUser, accessToken: 'mock-access-token' }, 'Login successful'),
      );
    }
    if (path === '/auth/logout') {
      role = null;
      return json(success(null, 'Logout successful'));
    }
    if (path === '/auth/change-password') return json(success(null, 'Password changed'));
    if (path === '/auth/forgot-password') return json(success(null, 'Reset instructions created'));
    if (path === '/auth/users' && method === 'GET')
      return json(success([admin, { ...studentUser, student }]));
    if (path === '/auth/users' && method === 'POST')
      return json(
        success({ ...request.postDataJSON(), _id: '507f1f77bcf86cd799439099' }, 'User created'),
        201,
      );
    if (path.startsWith('/auth/users/') && method === 'PATCH')
      return json(success({ ...admin, ...request.postDataJSON() }, 'User updated'));
    if (path === '/dashboard/workspace')
      return json(success({
        generatedAt: new Date().toISOString(), profile: role === 'student' ? student : null,
        cards: { total: 24, active: 22, placed: 2, applications: 8520, todayApplications: 68, updated: 18, pending: 4 },
        attention: [{ ...student, createdBy: { name: admin.name } }],
        recent: [{ ...history, applicationDate: '2026-08-10', recordedBy: { name: admin.name } }],
        dailyTrend: [{ date: '2026-08-09', applications: 61 }, { date: '2026-08-10', applications: 68 }],
      }));
    if (path === '/dashboard')
      return json(
        success({
          cards: {
            totalStudents: 24,
            activeStudents: 22,
            placedStudents: 2,
            paidUsers: 10,
            freeUsers: 14,
            todayApplications: 68,
            yesterdayApplications: 61,
            rangeApplications: 925,
            overallApplications: 8520,
            averageApplicationsPerStudent: 355,
          },
          charts: {
            dailyTrend: [
              { date: '2026-08-09', applications: 61, cumulative: 857 },
              { date: '2026-08-10', applications: 68, cumulative: 925 },
            ],
            monthlyTrend: [
              { year: 2026, month: 7, applications: 840 },
              { year: 2026, month: 8, applications: 925 },
            ],
            technologyWise: [{ technology: 'MERN Stack', applications: 540 }],
            topStudents: [
              {
                candidateName: 'Asha Patil',
                technology: 'MERN Stack',
                applications: 82,
                totalApplications: 905,
                todayApplications: 5,
              },
            ],
            membershipDistribution: [
              { membershipType: 'paid', students: 10 },
              { membershipType: 'free', students: 14 },
            ],
            batchWise: [{ batch: '2026-A', applications: 640, students: 12 }],
            staffPerformance: [
              {
                staffId: '507f1f77bcf86cd799439001',
                name: 'Placement Admin',
                email: 'admin@example.com',
                totalStudents: 24,
                applications: 925,
                todayApplications: 68,
                overallApplications: 8520,
                averagePerStudent: 355,
              },
            ],
            recentActivity: [
              {
                _id: '507f1f77bcf86cd799439031',
                applicationDate: '2026-08-10T00:00:00.000Z',
                student: {
                  candidateName: 'Asha Patil',
                  personalEmail: 'asha@example.com',
                },
                recordedBy: { name: 'Placement Admin' },
                previousCount: 900,
                dailyCount: 5,
                currentCount: 905,
                source: 'student',
              },
            ],
          },
        }),
      );
    if (path === '/technologies' && method === 'GET') return json(success([technology]));
    if (path === '/technologies' && method === 'POST')
      return json(
        success(
          { ...request.postDataJSON(), _id: '507f1f77bcf86cd799439098', isActive: true },
          'Technology created',
        ),
        201,
      );
    if (path.startsWith('/technologies/') && method === 'PATCH')
      return json(success({ ...technology, ...request.postDataJSON() }, 'Technology updated'));
    if (path === '/students/me' && method === 'GET') return json(success(student));
    if (path === '/students/me/application-count' && method === 'PATCH') {
      const body = request.postDataJSON();
      return json(
        success(
          {
            student: {
              ...student,
              currentTotalApplicationCount: body.currentTotalApplicationCount,
            },
            history: {
              ...history,
              currentCount: body.currentTotalApplicationCount,
              dailyCount: body.currentTotalApplicationCount - 900,
            },
          },
          'Application count updated',
        ),
      );
    }
    if (path === '/students' && method === 'GET')
      return json(
        success([student], 'Success', { pagination: { page: 1, limit: 20, total: 1, pages: 1 } }),
      );
    if (path === '/students' && method === 'POST')
      return json(
        success({ ...request.postDataJSON(), _id: '507f1f77bcf86cd799439097' }, 'Student created'),
        201,
      );
    if (/\/students\/[^/]+\/application-count$/.test(path) && method === 'PATCH') {
      const body = request.postDataJSON();
      return json(
        success(
          { student, history: { ...history, dailyCount: body.currentTotalApplicationCount - 900 } },
          'Application count updated',
        ),
      );
    }
    if (path.startsWith('/students/') && method === 'PATCH')
      return json(success({ ...student, ...request.postDataJSON() }, 'Student updated'));
    if (path.startsWith('/students/') && method === 'DELETE')
      return json(success(null, 'Student deleted'));
    if (path === '/application-history')
      return json(
        success([history], 'Success', { pagination: { page: 1, limit: 20, total: 1, pages: 1 } }),
      );
    if (path === '/reports' && method === 'GET')
      return json(
        success([], 'Success', { pagination: { page: 1, limit: 20, total: 0, pages: 0 } }),
      );
    if (path === '/reports/generate' && method === 'POST')
      return route.fulfill({
        status: 200,
        headers: {
          'content-type': 'text/csv',
          'content-disposition': 'attachment; filename="smartapply-report.csv"',
        },
        body: 'Candidate,Applications\nAsha Patil,5',
      });
    return json({ success: false, message: `Unhandled mock route: ${method} ${path}` }, 500);
  });
}
