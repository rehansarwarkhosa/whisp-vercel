const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.userId) {
    return next();
  }
  res.redirect('/login');
};

const isAdmin = (req, res, next) => {
  if (req.session && req.session.userId && req.session.isAdmin) {
    return next();
  }
  res.status(403).send('Access denied. Admin only.');
};

const isApproved = (req, res, next) => {
  if (req.session && req.session.userId && req.session.status === 'approved') {
    return next();
  }
  res.redirect('/login?error=pending');
};

const redirectIfAuthenticated = (req, res, next) => {
  if (req.session && req.session.userId) {
    if (req.session.isAdmin) {
      return res.redirect('/admin');
    }
    return res.redirect('/chat');
  }
  next();
};

export { isAuthenticated, isAdmin, isApproved, redirectIfAuthenticated };
