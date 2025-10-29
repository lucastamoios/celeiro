package accounts

type Role string

const (
	RoleAdmin          Role = "admin"
	RoleRegularManager Role = "regular_manager"
	RoleRegularUser    Role = "regular_user"
)

func (r Role) IsValid() bool {
	return r == RoleAdmin ||
		r == RoleRegularManager ||
		r == RoleRegularUser
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
)

func (p Permission) IsValid() bool {
	return p == PermissionViewOrganizations ||
		p == PermissionEditOrganizations ||
		p == PermissionCreateOrganizations ||
		p == PermissionDeleteOrganizations ||
		p == PermissionViewRegularUsers ||
		p == PermissionEditRegularUsers ||
		p == PermissionCreateRegularUsers ||
		p == PermissionDeleteRegularUsers
}
