/**
 * Department and Role Navigation Utilities.
 * Enforces Zero-Trust role mapping and micro-segment permissions.
 */

export function getDepartmentRoute(user) {
  if (!user) return '/login';

  const roleName = (user.role?.name || '').toLowerCase();
  const allowedSegments = user.role?.allowed_segments || [];
  const dept = (user.department || '').toLowerCase();

  // 1. Admins have full access and land on the Overview Dashboard
  if (user.is_admin || roleName === 'admin') {
    return '/';
  }

  // 2. Prioritize cryptographic micro-segment permissions
  if (allowedSegments.includes('hr-ns') || roleName === 'hr') {
    return '/departments/hr';
  }

  if (allowedSegments.includes('finance-ns') || roleName === 'finance') {
    return '/departments/finance';
  }

  if (allowedSegments.includes('it-ns') || roleName === 'it') {
    return '/departments/it';
  }

  // 3. Fallback based on department string
  if (dept.includes('hr')) return '/departments/hr';
  if (dept.includes('fin')) return '/departments/finance';
  if (dept.includes('it')) return '/departments/it';

  // 4. Default for non-departmental VPN users
  return '/vpn-config';
}

export function getDepartmentName(user) {
  if (!user) return '';
  if (user.is_admin || user.role?.name?.toLowerCase() === 'admin') {
    return 'Administration';
  }
  const route = getDepartmentRoute(user);
  if (route.includes('hr')) return 'Human Resources';
  if (route.includes('finance')) return 'Finance & Accounting';
  if (route.includes('it')) return 'IT Operations';
  return user.department || user.role?.name || 'Enterprise User';
}

export function canAccessSegment(user, segment) {
  if (!user) return false;
  if (user.is_admin || user.role?.name?.toLowerCase() === 'admin') return true;

  const allowedSegments = user.role?.allowed_segments || [];
  if (!segment) return false;

  // Extract base segment identifier, e.g. "it-ns" from "it-ns (10.20.30.0/24)"
  const cleanSegment = segment.split(' ')[0].trim().toLowerCase();

  // 1. Direct match or base name match against user allowed_segments
  const hasDirectAccess = allowedSegments.some((s) => {
    const sLower = s.toLowerCase().trim();
    return (
      sLower === cleanSegment ||
      sLower === segment.toLowerCase().trim() ||
      segment.toLowerCase().trim().startsWith(sLower)
    );
  });

  if (hasDirectAccess) return true;

  // 2. Fallback check based on role name or department
  const roleName = (user.role?.name || '').toLowerCase();
  const dept = (user.department || '').toLowerCase();
  if (cleanSegment === 'hr-ns' && (roleName.includes('hr') || dept.includes('hr'))) return true;
  if (cleanSegment === 'finance-ns' && (roleName.includes('fin') || dept.includes('fin'))) return true;
  if (cleanSegment === 'it-ns' && (roleName.includes('it') || dept.includes('it'))) return true;

  return false;
}

export function canAccessDepartment(user, dept) {
  if (!user) return false;
  if (user.is_admin || user.role?.name?.toLowerCase() === 'admin') return true;

  const segmentMap = {
    hr: 'hr-ns',
    finance: 'finance-ns',
    it: 'it-ns',
  };

  const requiredSegment = segmentMap[dept.toLowerCase()];
  if (!requiredSegment) return false;
  return canAccessSegment(user, requiredSegment);
}
