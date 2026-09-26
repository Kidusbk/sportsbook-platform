-- 002: Roles, permissions, and user role assignments
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  resource VARCHAR(50) NOT NULL,
  action VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(resource, action)
);

CREATE TABLE role_permissions (
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE user_roles (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assigned_by UUID REFERENCES users(id),
  PRIMARY KEY (user_id, role_id)
);

INSERT INTO roles (name, description, is_system) VALUES
  ('USER', 'Default user role', TRUE),
  ('SUPPORT_AGENT', 'Customer support agent', TRUE),
  ('SPORTSBOOK_ADMIN', 'Sportsbook management', TRUE),
  ('FINANCE_ADMIN', 'Financial operations', TRUE),
  ('KYC_ADMIN', 'KYC verification', TRUE),
  ('RISK_ADMIN', 'Risk management', TRUE),
  ('REPORTING_USER', 'Reporting access', TRUE),
  ('SUPER_ADMIN', 'Full system access', TRUE);

INSERT INTO permissions (name, description, resource, action) VALUES
  ('users.read', 'View user profiles', 'users', 'read'),
  ('users.create', 'Create users', 'users', 'create'),
  ('users.update', 'Update users', 'users', 'update'),
  ('users.delete', 'Delete users', 'users', 'delete'),
  ('users.list', 'List all users', 'users', 'list'),
  ('users.manage', 'Full user management', 'users', 'manage'),
  ('roles.read', 'View roles', 'roles', 'read'),
  ('roles.manage', 'Manage roles', 'roles', 'manage'),
  ('permissions.read', 'View permissions', 'permissions', 'read'),
  ('permissions.manage', 'Manage permissions', 'permissions', 'manage'),
  ('audit_logs.read', 'View audit logs', 'audit_logs', 'read'),
  ('audit_logs.list', 'List audit logs', 'audit_logs', 'list');

-- Grant permissions to roles
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p WHERE r.name = 'SUPER_ADMIN';

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'SUPPORT_AGENT' AND p.name IN ('users.read', 'users.list');
