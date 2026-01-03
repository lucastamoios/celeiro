package accounts

type Role string

const (
	RoleSuperAdmin     Role = "super_admin"
	RoleAdmin          Role = "admin"
	RoleRegularManager Role = "regular_manager"
	RoleRegularUser    Role = "regular_user"
)

func (r Role) IsValid() bool {
	return r == RoleSuperAdmin ||
		r == RoleAdmin ||
		r == RoleRegularManager ||
		r == RoleRegularUser
}

func (r Role) IsSuperAdmin() bool {
	return r == RoleSuperAdmin
}

type Permission string

const (
	PermissionViewOrganizations   Permission = "view_organizations"
	PermissionEditOrganizations   Permission = "edit_organizations"
	PermissionCreateOrganizations Permission = "create_organizations"
	PermissionDeleteOrganizations Permission = "delete_organizations"
	PermissionViewRegularUsers    Permission = "view_regular_users"
	PermissionEditRegularUsers    Permission = "edit_regular_users"
	PermissionCreateRegularUsers  Permission = "create_regular_users"
	PermissionDeleteRegularUsers  Permission = "delete_regular_users"
	// Super admin permissions (system-wide)
	PermissionViewAllUsers         Permission = "view_all_users"
	PermissionCreateSystemInvites  Permission = "create_system_invites"
	PermissionViewAllOrganizations Permission = "view_all_organizations"
)

func (p Permission) IsValid() bool {
	return p == PermissionViewOrganizations ||
		p == PermissionEditOrganizations ||
		p == PermissionCreateOrganizations ||
		p == PermissionDeleteOrganizations ||
		p == PermissionViewRegularUsers ||
		p == PermissionEditRegularUsers ||
		p == PermissionCreateRegularUsers ||
		p == PermissionDeleteRegularUsers ||
		p == PermissionViewAllUsers ||
		p == PermissionCreateSystemInvites ||
		p == PermissionViewAllOrganizations
}
