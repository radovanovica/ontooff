'use client';

import {
  Box,
  Button,
  TextField,
  Typography,
  IconButton,
  CircularProgress,
  Alert,
  Paper,
  Grid,
  Chip,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  MenuItem,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import { Add, Edit, Delete } from '@mui/icons-material';
import { useState, useEffect } from 'react';
import { useTranslation } from '@/i18n/client';

interface ActivityType {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  sortOrder: number;
  isActive: boolean;
  _count?: { activityLocations: number };
}

interface FormState {
  name: string;
  description: string;
  icon: string;
  color: string;
  sortOrder: string;
}

interface PricingRule {
  id: string;
  name: string;
  pricingType: string;
  currency: string;
  pricingTiers: { id: string; ageGroup: string; label: string; pricePerUnit: number }[];
}

interface PricingTierDraft {
  ageGroup: string;
  label: string;
  pricePerUnit: string;
}

const EMPTY_FORM: FormState = { name: '', description: '', icon: '', color: '#1976d2', sortOrder: '0' };

interface Props {
  placeId: string;
}

export default function ActivityTypesTab({ placeId }: Props) {
  const { t } = useTranslation('owner');
  const [types, setTypes] = useState<ActivityType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ActivityType | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<ActivityType | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [pricingByType, setPricingByType] = useState<Record<string, PricingRule[]>>({});
  const [pricingLoading, setPricingLoading] = useState(false);
  const [pricingError, setPricingError] = useState<string | null>(null);

  const [pricingDialogOpen, setPricingDialogOpen] = useState(false);
  const [pricingTypeTarget, setPricingTypeTarget] = useState<ActivityType | null>(null);
  const [pricingSaving, setPricingSaving] = useState(false);
  const [pricingFormError, setPricingFormError] = useState<string | null>(null);
  const [ruleName, setRuleName] = useState('');
  const [pricingType, setPricingType] = useState('PER_PERSON_PER_DAY');
  const [currency, setCurrency] = useState('RSD');
  const [paymentMethod, setPaymentMethod] = useState('BOTH');
  const [requiresPayment, setRequiresPayment] = useState(true);
  const [pricingTiersDraft, setPricingTiersDraft] = useState<PricingTierDraft[]>([
    { ageGroup: 'ADULT', label: '', pricePerUnit: '0' },
  ]);

  const load = () => {
    setLoading(true);
    fetch(`/api/activity-types?placeId=${placeId}`)
      .then((r) => r.json())
      .then((d) => setTypes(d.data ?? []))
        .catch(() => setError(t('activityTypes.errors.loadFailed')))
      .finally(() => setLoading(false));
  };

  const loadPricing = (activityTypeIds: string[]) => {
    setPricingLoading(true);
    setPricingError(null);
    Promise.all(
      activityTypeIds.map(async (id) => {
        const res = await fetch(`/api/pricing?activityTypeId=${id}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? t('activityTypes.errors.pricingLoadFailed'));
        return [id, (json.data ?? []) as PricingRule[]] as const;
      })
    )
      .then((entries) => {
        const next: Record<string, PricingRule[]> = {};
        for (const [id, rules] of entries) next[id] = rules;
        setPricingByType(next);
      })
        .catch((e) => setPricingError(e instanceof Error ? e.message : t('activityTypes.errors.pricingLoadFailed')))
      .finally(() => setPricingLoading(false));
  };

  useEffect(() => { load(); }, [placeId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (types.length === 0) {
      setPricingByType({});
      return;
    }
    loadPricing(types.map((t) => t.id));
  }, [types]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, sortOrder: String(types.length) });
    setFormError(null);
    setDialogOpen(true);
  };

  const openEdit = (at: ActivityType) => {
    setEditing(at);
    setForm({
      name: at.name,
      description: at.description ?? '',
      icon: at.icon ?? '',
      color: at.color ?? '#1976d2',
      sortOrder: String(at.sortOrder),
    });
    setFormError(null);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setFormError(t('activityTypes.errors.nameRequired')); return; }
    setSaving(true);
    setFormError(null);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        icon: form.icon.trim() || undefined,
        color: form.color || undefined,
        sortOrder: parseInt(form.sortOrder) || 0,
        placeId,
      };

      let res: Response;
      if (editing) {
        res = await fetch(`/api/activity-types/${editing.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch('/api/activity-types', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? t('activityTypes.errors.saveFailed'));
      }
      setDialogOpen(false);
      load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t('activityTypes.errors.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/activity-types/${deleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? t('activityTypes.errors.deleteFailed'));
      }
      setDeleteTarget(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('activityTypes.errors.deleteFailed'));
    } finally {
      setDeleting(false);
    }
  };

  const openPricingCreate = (at: ActivityType) => {
    setPricingTypeTarget(at);
    setPricingDialogOpen(true);
    setPricingFormError(null);
    setRuleName('');
    setPricingType('PER_PERSON_PER_DAY');
    setCurrency('RSD');
    setPaymentMethod('BOTH');
    setRequiresPayment(true);
    setPricingTiersDraft([{ ageGroup: 'ADULT', label: t('pricing.tiers.ageGroups.ADULT'), pricePerUnit: '0' }]);
  };

  const addTierDraft = () => {
    setPricingTiersDraft((prev) => [...prev, { ageGroup: 'CUSTOM', label: '', pricePerUnit: '0' }]);
  };

  const updateTierDraft = (index: number, patch: Partial<PricingTierDraft>) => {
    setPricingTiersDraft((prev) => prev.map((tier, idx) => (idx === index ? { ...tier, ...patch } : tier)));
  };

  const removeTierDraft = (index: number) => {
    setPricingTiersDraft((prev) => (prev.length <= 1 ? prev : prev.filter((_, idx) => idx !== index)));
  };

  const handleCreatePricingRule = async () => {
    if (!pricingTypeTarget) return;
    if (!ruleName.trim()) {
      setPricingFormError(t('activityTypes.errors.ruleNameRequired'));
      return;
    }
    if (pricingTiersDraft.length === 0) {
      setPricingFormError(t('activityTypes.errors.oneTierRequired'));
      return;
    }

    const duplicateNonCustom = pricingTiersDraft
      .filter((tier) => tier.ageGroup !== 'CUSTOM')
      .map((tier) => tier.ageGroup);
    if (new Set(duplicateNonCustom).size !== duplicateNonCustom.length) {
      setPricingFormError(t('activityTypes.errors.uniqueNonCustomTier'));
      return;
    }

    const normalizedTiers = pricingTiersDraft.map((tier, idx) => {
      const price = Number(tier.pricePerUnit);
      if (!tier.label.trim()) throw new Error(`Tier #${idx + 1}: label is required`);
      if (Number.isNaN(price) || price < 0) throw new Error(`Tier #${idx + 1}: price must be 0 or greater`);
      return {
        ageGroup: tier.ageGroup,
        label: tier.label.trim(),
        pricePerUnit: price,
        sortOrder: idx,
      };
    });

    setPricingSaving(true);
    setPricingFormError(null);
    try {
      const res = await fetch('/api/pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activityTypeId: pricingTypeTarget.id,
          name: ruleName.trim(),
          pricingType,
          paymentMethod,
          requiresPayment,
          currency: currency.trim() || 'RSD',
          pricingTiers: normalizedTiers,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.error ?? t('activityTypes.errors.pricingCreateFailed'));
      }
      setPricingDialogOpen(false);
      loadPricing([pricingTypeTarget.id]);
    } catch (e) {
      setPricingFormError(e instanceof Error ? e.message : t('activityTypes.errors.pricingCreateFailed'));
    } finally {
      setPricingSaving(false);
    }
  };

  const handleDeletePricingRule = async (activityTypeId: string, ruleId: string) => {
    if (!confirm(t('activityTypes.deletePricingRuleConfirm'))) return;
    const res = await fetch('/api/pricing', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: ruleId }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setPricingError(json.error ?? t('activityTypes.errors.pricingDeleteFailed'));
      return;
    }
    loadPricing([activityTypeId]);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>{t('activityTypes.title')}</Typography>
          <Typography variant="body2" color="text.secondary">
            {t('activityTypes.examples')}
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={openCreate}>
          {t('activityTypes.addNew')}
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {pricingError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setPricingError(null)}>{pricingError}</Alert>}

      {types.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            {t('activityTypes.empty')}
          </Typography>
          <Button variant="outlined" startIcon={<Add />} onClick={openCreate}>
            {t('activityTypes.addNew')}
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {types.map((at) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={at.id}>
              <Paper
                variant="outlined"
                sx={{
                  p: 2, borderRadius: 2,
                  borderLeft: '4px solid',
                  borderLeftColor: at.color ?? 'primary.main',
                  display: 'flex', flexDirection: 'column', gap: 1,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                      {at.icon && (
                        <Typography sx={{ fontSize: '1.3rem', lineHeight: 1 }}>{at.icon}</Typography>
                      )}
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }} noWrap>
                        {at.name}
                      </Typography>
                      {!at.isActive && (
                        <Chip label={t('activityTypes.inactive')} size="small" color="default" sx={{ fontSize: '0.7rem', height: 18 }} />
                      )}
                    </Box>
                    {at.description && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25, fontSize: '0.8rem' }}>
                        {at.description}
                      </Typography>
                    )}
                  </Box>
                  <Box sx={{ display: 'flex', gap: 0.25, flexShrink: 0 }}>
                    <Tooltip title={t('common.edit')}>
                      <IconButton size="small" onClick={() => openEdit(at)}>
                        <Edit fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={t('common.delete')}>
                      <IconButton size="small" color="error" onClick={() => setDeleteTarget(at)}>
                        <Delete fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Chip
                    label={t('activityTypes.locationsCount', { count: at._count?.activityLocations ?? 0 })}
                    size="small"
                    variant="outlined"
                    sx={{ fontSize: '0.72rem', height: 20 }}
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                    {t('activityTypes.order')}: {at.sortOrder}
                  </Typography>
                </Box>

                <Divider sx={{ my: 1 }} />
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                    {t('pricing.title')}
                  </Typography>
                  <Button size="small" startIcon={<Add />} onClick={() => openPricingCreate(at)}>
                    {t('pricing.addNew')}
                  </Button>
                </Box>

                {pricingLoading && !(pricingByType[at.id]?.length) ? (
                  <Typography variant="caption" color="text.secondary">{t('activityTypes.pricingLoading')}</Typography>
                ) : (pricingByType[at.id]?.length ?? 0) === 0 ? (
                  <Typography variant="caption" color="text.secondary">{t('activityTypes.pricingEmpty')}</Typography>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    {(pricingByType[at.id] ?? []).map((rule) => (
                      <Box key={rule.id} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Chip
                          size="small"
                          label={`${rule.name} • ${rule.currency} • ${t('activityTypes.tiersCount', { count: rule.pricingTiers.length })}`}
                          variant="outlined"
                          sx={{ maxWidth: '100%' }}
                        />
                        <IconButton size="small" color="error" onClick={() => handleDeletePricingRule(at.id, rule.id)}>
                          <Delete fontSize="small" />
                        </IconButton>
                      </Box>
                    ))}
                  </Box>
                )}
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}

      {/* ── Create / Edit dialog ─────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? t('activityTypes.editTitle') : t('activityTypes.addNew')}</DialogTitle>
        <DialogContent>
          {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid size={{ xs: 12, sm: 8 }}>
              <TextField
                label={t('activityTypes.form.name')}
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                fullWidth
                autoFocus
                placeholder={t('activityTypes.examples')}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label={t('activityTypes.form.icon')}
                value={form.icon}
                onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
                fullWidth
                placeholder="🎣"
                helperText={t('activityTypes.singleEmoji')}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                label={t('activityTypes.form.description')}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                fullWidth
                multiline
                rows={2}
                placeholder={t('activityTypes.optionalShortDescription')}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label={t('activityTypes.form.color')}
                value={form.color}
                onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                fullWidth
                type="color"
                helperText={t('activityTypes.colorHint')}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label={t('activityTypes.sortOrder')}
                value={form.sortOrder}
                onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
                fullWidth
                type="number"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>{t('common.cancel')}</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {saving ? t('common.saving') : t('common.save')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={pricingDialogOpen} onClose={() => setPricingDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {t('pricing.addNew')} {pricingTypeTarget ? `— ${pricingTypeTarget.name}` : ''}
        </DialogTitle>
        <DialogContent sx={{ pt: '12px !important' }}>
          {pricingFormError && <Alert severity="error" sx={{ mb: 2 }}>{pricingFormError}</Alert>}
          <Grid container spacing={2}>
            <Grid size={{ xs: 12 }}>
              <TextField label={t('pricing.form.name')} value={ruleName} onChange={(e) => setRuleName(e.target.value)} fullWidth />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label={t('pricing.form.pricingType')} select value={pricingType} onChange={(e) => setPricingType(e.target.value)} fullWidth>
                <MenuItem value="PER_ACTIVITY">{t('pricing.form.pricingTypes.PER_ACTIVITY')}</MenuItem>
                <MenuItem value="PER_PERSON">{t('pricing.form.pricingTypes.PER_PERSON')}</MenuItem>
                <MenuItem value="PER_PERSON_PER_DAY">{t('pricing.form.pricingTypes.PER_PERSON_PER_DAY')}</MenuItem>
                <MenuItem value="PER_DAY">{t('pricing.form.pricingTypes.PER_DAY')}</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label={t('pricing.form.currency')} value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} fullWidth />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label={t('pricing.form.paymentMethod')} select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} fullWidth>
                <MenuItem value="CASH">{t('pricing.form.paymentMethods.CASH')}</MenuItem>
                <MenuItem value="CARD">{t('pricing.form.paymentMethods.CARD')}</MenuItem>
                <MenuItem value="BOTH">{t('pricing.form.paymentMethods.BOTH')}</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControlLabel
                control={<Checkbox checked={requiresPayment} onChange={(e) => setRequiresPayment(e.target.checked)} />}
                label={t('pricing.form.requiresPayment')}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>{t('pricing.tiers.heading')}</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                {pricingTiersDraft.map((tier, idx) => (
                  <Grid key={`${tier.ageGroup}-${idx}`} container spacing={1} sx={{ alignItems: 'center' }}>
                    <Grid size={{ xs: 12, sm: 3 }}>
                      <TextField
                        label={t('pricing.tiers.ageGroup')}
                        select
                        value={tier.ageGroup}
                        onChange={(e) => updateTierDraft(idx, { ageGroup: e.target.value })}
                        fullWidth
                      >
                        <MenuItem value="ADULT">{t('pricing.tiers.ageGroups.ADULT')}</MenuItem>
                        <MenuItem value="CHILD">{t('pricing.tiers.ageGroups.CHILD')}</MenuItem>
                        <MenuItem value="SENIOR">{t('pricing.tiers.ageGroups.SENIOR')}</MenuItem>
                        <MenuItem value="INFANT">{t('pricing.tiers.ageGroups.INFANT')}</MenuItem>
                        <MenuItem value="FAMILY">{t('pricing.tiers.ageGroups.FAMILY')}</MenuItem>
                        <MenuItem value="GROUP">{t('pricing.tiers.ageGroups.GROUP')}</MenuItem>
                        <MenuItem value="CUSTOM">{t('pricing.tiers.ageGroups.CUSTOM')}</MenuItem>
                      </TextField>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <TextField
                        label={t('pricing.tiers.label')}
                        value={tier.label}
                        onChange={(e) => updateTierDraft(idx, { label: e.target.value })}
                        fullWidth
                      />
                    </Grid>
                    <Grid size={{ xs: 9, sm: 3 }}>
                      <TextField
                        label={t('pricing.tiers.price')}
                        type="number"
                        value={tier.pricePerUnit}
                        onChange={(e) => updateTierDraft(idx, { pricePerUnit: e.target.value })}
                        fullWidth
                      />
                    </Grid>
                    <Grid size={{ xs: 3, sm: 2 }}>
                      <IconButton
                        color="error"
                        disabled={pricingTiersDraft.length === 1}
                        onClick={() => removeTierDraft(idx)}
                      >
                        <Delete />
                      </IconButton>
                    </Grid>
                  </Grid>
                ))}
                <Box>
                  <Button size="small" variant="outlined" startIcon={<Add />} onClick={addTierDraft}>
                    {t('pricing.tiers.addTier')}
                  </Button>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPricingDialogOpen(false)}>{t('common.cancel')}</Button>
          <Button variant="contained" onClick={handleCreatePricingRule} disabled={pricingSaving}>
            {pricingSaving ? t('common.saving') : t('common.save')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Delete confirm dialog ────────────────────────────────────────── */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{t('activityTypes.deleteTitle')}</DialogTitle>
        <DialogContent>
          <Typography>
            {t('activityTypes.deleteConfirm', { name: deleteTarget?.name })}
            {(deleteTarget?._count?.activityLocations ?? 0) > 0 && (
              <Alert severity="warning" sx={{ mt: 1.5 }}>
                {t('activityTypes.deleteWithLocationsWarning', { count: deleteTarget?._count?.activityLocations ?? 0 })}
              </Alert>
            )}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>{t('common.cancel')}</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDelete}
            disabled={deleting}
            startIcon={deleting ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {deleting ? t('activityTypes.deleting') : t('common.delete')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
