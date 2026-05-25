import {
  Box,
  Typography,
  Divider,
  Paper,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Alert,
} from '@mui/material';
import {
  Dashboard,
  People,
  Place,
  EventNote,
  Business,
  Campaign,
  Group,
  Article,
  Public,
  CheckCircle,
  Warning,
  Info,
  ArrowForward,
  AdminPanelSettings,
} from '@mui/icons-material';

interface Section {
  id: string;
  icon: React.ReactNode;
  title: string;
  path: string;
  description: string;
  steps: string[];
  tips?: string[];
  warnings?: string[];
}

const SECTIONS: Section[] = [
  {
    id: 'dashboard',
    icon: <Dashboard />,
    title: 'Admin Dashboard',
    path: '/admin',
    description:
      'The starting point showing a real-time overview of all key platform metrics.',
    steps: [
      'View the stat cards at the top: Total Users, Active Places, Total Bookings, Pending Bookings, Total Revenue, Organizations, Pending Orgs, and Community Locations.',
      'If any organizations are waiting for approval, a highlighted button will appear — click it to go directly to the Organizations page filtered to PENDING.',
      'The "Recent Bookings" table shows the latest registrations across the entire platform.',
      'Use the Quick Links section to jump to any admin area instantly.',
    ],
    tips: [
      'Check the dashboard every morning to catch pending org approvals or a spike in bookings.',
      'Revenue shown is only from confirmed PAID bookings.',
    ],
  },
  {
    id: 'users',
    icon: <People />,
    title: 'User Management',
    path: '/admin/users',
    description:
      'View, search, and manage all registered platform users. Control roles and account status.',
    steps: [
      'Use the search bar to find users by name or email.',
      'Use the Role filter dropdown to show only users with a specific role (SUPER_ADMIN, PLACE_OWNER, USER, CONTRIBUTOR).',
      'Click the activate/deactivate toggle icon next to a user to enable or disable their account. Inactive users cannot sign in.',
      'Click the role icon to open a dropdown and change the user\'s role. Changing to PLACE_OWNER grants access to the owner dashboard.',
      'Use "View Bookings" to see all registrations for a specific user.',
    ],
    tips: [
      'Before disabling an account, check if the user has active bookings.',
      'Changing a user\'s role to PLACE_OWNER does NOT automatically create an organization — they must register one or you must manually link a place.',
    ],
    warnings: [
      'Changing your own role will immediately lock you out of the admin panel.',
    ],
  },
  {
    id: 'places',
    icon: <Place />,
    title: 'Places',
    path: '/admin/places',
    description:
      'View and manage all registered places on the platform. Control visibility status and quality tier.',
    steps: [
      'Use the search box to find a place by name or city.',
      'Click the status chip (Regular / Recommended / Premium) in the Status column to change a place\'s tier. A dropdown will appear.',
      'Regular = standard listing. Recommended = highlighted in search with a green badge. Premium = featured placement with a gold badge.',
      'Click the external link icon to open the place\'s public page in a new tab.',
      'To create a new place on behalf of an organization, go to Owner → Places → Add New, select the organization from the dropdown (visible only to super admin), and the place will be assigned to that org\'s owner.',
    ],
    tips: [
      'Set a place to Recommended or Premium to help it rank higher and attract more bookings.',
      'Check the "Locations" count — a place with 0 locations has no bookable spots yet.',
    ],
  },
  {
    id: 'registrations',
    icon: <EventNote />,
    title: 'Registrations (Bookings)',
    path: '/admin/registrations',
    description:
      'View, search, and manage all booking registrations across the entire platform.',
    steps: [
      'Use the search bar to find a registration by guest name, email, place name, or booking number.',
      'Use the Status filter to show only PENDING, CONFIRMED, CANCELLED, COMPLETED, or NO_SHOW bookings.',
      'Use the "Date From" and "Date To" pickers to filter bookings by check-in date range.',
      'Click a booking row to open the detail page.',
      'On the detail page, use the Approve or Reject buttons to act on a pending booking. The guest is notified by email automatically.',
      'Payment status can be updated on the detail page (UNPAID → PAID, etc.).',
      'The Payment Summary section shows the full price breakdown per tier.',
    ],
    tips: [
      'Pending bookings that have been waiting over 24 hours should be reviewed first.',
      'The "Source" field tells you if the booking came from the website (WEB) or an embedded widget (EMBED).',
    ],
    warnings: [
      'Cancelling a confirmed booking will notify the guest but does NOT process any payment refund automatically.',
    ],
  },
  {
    id: 'organizations',
    icon: <Business />,
    title: 'Organizations',
    path: '/admin/organizations',
    description:
      'Review and approve organization registration requests. Manage which places belong to each organization.',
    steps: [
      'New organizations start with PENDING status. The dashboard will alert you when one is waiting.',
      'Click the green checkmark icon to Approve an organization. This will create a PLACE_OWNER user account (or upgrade an existing one) and send them their login credentials by email.',
      'Click the red X icon to Reject an organization. You can optionally provide a reason that will be emailed to them.',
      'Click the orange pause icon to Suspend an approved organization.',
      'Click the blue map-pin icon (Manage Places) to open the Places dialog for that organization.',
      'In the Places dialog: the top section shows currently linked places — click the X icon next to any to unlink it.',
      'Use the "Assign a place" autocomplete search to find unlinked places and assign them to the organization.',
      'Click the external link icon (if shown) to visit the organization\'s website.',
      'Click the red trash icon to permanently delete an organization and all its data.',
    ],
    tips: [
      'Always verify the organization\'s email and website before approving.',
      'A place can only belong to one organization at a time. Use "Manage Places" to reassign.',
    ],
    warnings: [
      'Deletion is permanent and cannot be undone. All linked places, bookings, and user data for that organization will be removed.',
    ],
  },
  {
    id: 'outreach',
    icon: <Campaign />,
    title: 'Outreach / CRM',
    path: '/admin/outreach',
    description:
      'Track potential client organizations from first contact through to conversion. Replaces the Excel-based tracking sheet.',
    steps: [
      'Click "Add Contact" to create a new lead. Business Name is required; all other fields are optional.',
      'Status tracks the sales stage: New → Contacted → Interested → Proposal Sent → Converted → Declined / Archived.',
      'Priority (Low / Medium / High) helps you focus on the most important leads.',
      'Source records where the lead came from: REFERRAL, COLD_OUTREACH, INBOUND, SOCIAL_MEDIA, EVENT, OTHER.',
      'Next Action Date is the date you plan to follow up. Overdue contacts are sorted to the top.',
      'Use the Status and Priority filter dropdowns at the top to focus your view.',
      'Click the pencil (Edit) icon on any row to update the contact details or status.',
      'When a contact converts and registers as an organization, change their status to CONVERTED — the Converted At date is recorded automatically.',
      'Click the trash icon to permanently delete a contact you no longer need.',
    ],
    tips: [
      'Keep the Notes field updated with conversation summaries after each interaction.',
      'Move stale leads to ARCHIVED instead of deleting so you keep the history.',
    ],
  },
  {
    id: 'contributors',
    icon: <Group />,
    title: 'Contributors',
    path: '/admin/contributors',
    description:
      'Manage contributor accounts and grant or revoke their access to specific places for writing blog posts.',
    steps: [
      'Click "Add Contributor" to create a new contributor account. Provide their name and email — they will receive an invitation email.',
      'The contributor list shows all accounts with the CONTRIBUTOR role.',
      'Use the search box to find a contributor by name or email.',
      'Next to each contributor you can see which places they have access to.',
      'Click the key/access icon to manage a contributor\'s place access — grant or revoke specific places.',
      'To remove a contributor entirely, click the delete icon. Their blog posts will remain but they will no longer be able to sign in as contributor.',
    ],
    tips: [
      'Contributors can write and publish blog posts about places they have access to, which helps with SEO and content marketing.',
      'Revoke access from places when a contributor is no longer actively writing about them.',
    ],
  },
  {
    id: 'blog',
    icon: <Article />,
    title: 'Blog Posts',
    path: '/admin/blog',
    description:
      'Review, publish, and manage all blog posts written by contributors and admins.',
    steps: [
      'Use the Status filter to view DRAFT, PENDING (submitted for review), PUBLISHED, or ARCHIVED posts.',
      'Use the search bar to find posts by title.',
      'Click a post row to open it and review/edit its content.',
      'Change the status to PUBLISHED to make it visible to all visitors.',
      'Change the status to ARCHIVED to hide a published post without deleting it.',
      'Click the delete icon to permanently remove a post.',
    ],
    tips: [
      'Posts submitted by contributors will appear in PENDING status — review them before publishing.',
      'Published posts improve search engine visibility for the places they cover.',
    ],
    warnings: [
      'Deleting a published post cannot be undone and may break external links to it.',
    ],
  },
  {
    id: 'free-locations',
    icon: <Public />,
    title: 'Community (Free) Locations',
    path: '/admin/free-locations',
    description:
      'Manage publicly shared free outdoor spots submitted directly by the admin team. These are not tied to any organization.',
    steps: [
      'Click "Add Location" to create a new free community spot.',
      'Fill in the name, description, city, country, category, and coordinates (latitude/longitude).',
      'Use the map picker to place a pin on the exact location.',
      'Upload a cover image to make the listing more attractive.',
      'Toggle the Active switch to control whether a location is visible to the public.',
      'Edit an existing location by clicking the pencil icon.',
      'Delete a location using the trash icon — confirm the prompt.',
    ],
    tips: [
      'Free locations appear alongside regular places in search results.',
      'Always add a good cover image and accurate coordinates for the best user experience.',
    ],
  },
];

export const metadata = { title: 'Admin Help Guide — ontooff' };

export default function AdminHelpPage() {
  return (
    <Box
      sx={{
        maxWidth: 900,
        mx: 'auto',
        px: { xs: 2, sm: 4 },
        py: 5,
        fontFamily: 'inherit',
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
        <AdminPanelSettings sx={{ fontSize: 40, color: 'primary.main' }} />
        <Box>
          <Typography variant="h3" sx={{ fontWeight: 800, color: 'text.primary', lineHeight: 1.2 }}>
            Admin Help Guide
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>
            Step-by-step instructions for managing the ontooff platform
          </Typography>
        </Box>
      </Box>

      <Alert severity="info" sx={{ my: 3 }}>
        This guide is intended for <strong>Super Admin</strong> users only. Keep this window open alongside the admin panel while you work.
      </Alert>

      {/* Table of contents */}
      <Paper elevation={1} sx={{ p: 3, mb: 5, borderRadius: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
          Table of Contents
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {SECTIONS.map((s) => (
            <Chip
              key={s.id}
              icon={s.icon as React.ReactElement}
              label={s.title}
              component="a"
              href={`#${s.id}`}
              clickable
              variant="outlined"
              size="small"
            />
          ))}
        </Box>
      </Paper>

      {/* Sections */}
      {SECTIONS.map((section, idx) => (
        <Box key={section.id} id={section.id} sx={{ mb: 6 }}>
          {idx > 0 && <Divider sx={{ mb: 5 }} />}

          {/* Section header */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
            <Box sx={{ color: 'primary.main', display: 'flex' }}>{section.icon}</Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              {section.title}
            </Typography>
            <Chip label={section.path} size="small" variant="outlined" sx={{ fontFamily: 'monospace', fontSize: '0.72rem' }} />
          </Box>

          <Typography variant="body1" color="text.secondary" sx={{ mb: 2.5, pl: 4 }}>
            {section.description}
          </Typography>

          {/* Steps */}
          <Paper variant="outlined" sx={{ borderRadius: 2, mb: 2 }}>
            <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                How to use
              </Typography>
            </Box>
            <List disablePadding>
              {section.steps.map((step, i) => (
                <ListItem key={i} sx={{ px: 2, py: 0.75, alignItems: 'flex-start', borderBottom: i < section.steps.length - 1 ? '1px solid' : 'none', borderColor: 'divider' }}>
                  <ListItemIcon sx={{ minWidth: 36, mt: 0.25 }}>
                    <Box
                      sx={{
                        width: 22,
                        height: 22,
                        borderRadius: '50%',
                        bgcolor: 'primary.main',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {i + 1}
                    </Box>
                  </ListItemIcon>
                  <ListItemText
                    primary={step}
                    slotProps={{ primary: { variant: 'body2' } }}
                  />
                </ListItem>
              ))}
            </List>
          </Paper>

          {/* Tips */}
          {section.tips && section.tips.length > 0 && (
            <Box sx={{ mb: 1.5 }}>
              {section.tips.map((tip, i) => (
                <Box key={i} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', mb: 0.75 }}>
                  <Info sx={{ fontSize: 17, color: 'info.main', mt: 0.2, flexShrink: 0 }} />
                  <Typography variant="body2" color="text.secondary">{tip}</Typography>
                </Box>
              ))}
            </Box>
          )}

          {/* Warnings */}
          {section.warnings && section.warnings.length > 0 && (
            <Box>
              {section.warnings.map((w, i) => (
                <Box key={i} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', mb: 0.75 }}>
                  <Warning sx={{ fontSize: 17, color: 'warning.main', mt: 0.2, flexShrink: 0 }} />
                  <Typography variant="body2" color="warning.dark">{w}</Typography>
                </Box>
              ))}
            </Box>
          )}
        </Box>
      ))}

      {/* Footer */}
      <Divider sx={{ mb: 3 }} />
      <Typography variant="caption" color="text.disabled" sx={{ display: 'block', textAlign: 'center', pb: 4 }}>
        ontooff Admin Help Guide — For internal use only
      </Typography>
    </Box>
  );
}
