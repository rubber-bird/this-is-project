import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import { useSearchParams } from "react-router-dom";

import {
  createCheckoutSession,
  createPortalSession,
  getBilling,
  type BillingState,
} from "../api";

const PRO_FEATURES = [
  "Unlimited projects",
  "Unlimited tasks",
  "Priority email support",
  "Advanced workflow controls",
];

const FREE_FEATURES = [
  "Up to 3 projects",
  "Up to 50 tasks per project",
  "Community support",
];

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso.replace(" ", "T") + "Z");
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function statusChip(status: string | null) {
  if (!status) return null;
  const palette: Record<string, "success" | "warning" | "error" | "default"> = {
    active: "success",
    trialing: "success",
    past_due: "warning",
    unpaid: "error",
    canceled: "default",
    incomplete: "warning",
    incomplete_expired: "error",
  };
  return (
    <Chip
      size="small"
      label={status.replace("_", " ")}
      color={palette[status] ?? "default"}
      sx={{ textTransform: "capitalize" }}
    />
  );
}

export function BillingPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [billing, setBilling] = useState<BillingState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState<{ kind: "success" | "info"; text: string } | null>(null);

  const refresh = useCallback(async () => {
    setError("");
    try {
      const state = await getBilling();
      setBilling(state);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load billing");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const state = await getBilling();
        if (!cancelled) setBilling(state);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load billing");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const session = searchParams.get("session");
    if (session === "success") {
      setNotice({
        kind: "success",
        text: "Payment received — your subscription is being activated. This may take a few seconds.",
      });
      void refresh();
      setSearchParams({}, { replace: true });
    } else if (session === "cancel") {
      setNotice({ kind: "info", text: "Checkout canceled. No changes were made." });
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams, refresh]);

  const onSubscribe = async () => {
    setActionError("");
    setActionBusy(true);
    try {
      const { url } = await createCheckoutSession();
      if (url) window.location.href = url;
      else setActionError("Stripe did not return a checkout URL");
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed to start checkout");
    } finally {
      setActionBusy(false);
    }
  };

  const onManage = async () => {
    setActionError("");
    setActionBusy(true);
    try {
      const { url } = await createPortalSession();
      if (url) window.location.href = url;
      else setActionError("Stripe did not return a portal URL");
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed to open billing portal");
    } finally {
      setActionBusy(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  const isPro = billing?.plan === "pro";
  const hasCustomer = billing?.has_customer ?? false;

  return (
    <Stack spacing={3}>
      {notice ? (
        <Alert severity={notice.kind} onClose={() => setNotice(null)}>
          {notice.text}
        </Alert>
      ) : null}
      {actionError ? <Alert severity="error">{actionError}</Alert> : null}

      <Paper
        sx={{
          p: { xs: 2.5, sm: 3.5 },
          borderRadius: 3,
          border: "1px solid",
          borderColor: "divider",
          boxShadow:
            "0 1px 2px rgba(15, 23, 42, 0.04), 0 4px 16px rgba(15, 23, 42, 0.04)",
        }}
      >
        <Stack spacing={2}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              Current plan
            </Typography>
            <Chip
              label={isPro ? "Pro" : "Free"}
              color={isPro ? "primary" : "default"}
              sx={{ fontWeight: 700 }}
            />
            {statusChip(billing?.subscription_status ?? null)}
          </Stack>
          <Typography variant="body2" color="text.secondary">
            {isPro
              ? `Renews on ${formatDate(billing?.current_period_end ?? null)}`
              : "You are on the Free plan."}
          </Typography>
          <Stack direction="row" spacing={1.5} sx={{ pt: 1 }}>
            {!isPro ? (
              <Button
                variant="contained"
                size="large"
                onClick={() => void onSubscribe()}
                disabled={actionBusy}
              >
                {actionBusy ? "Opening Stripe…" : "Upgrade to Pro"}
              </Button>
            ) : null}
            {hasCustomer ? (
              <Button
                variant="outlined"
                size="large"
                onClick={() => void onManage()}
                disabled={actionBusy}
                startIcon={<OpenInNewRoundedIcon />}
              >
                Manage billing
              </Button>
            ) : null}
          </Stack>
        </Stack>
      </Paper>

      <Stack direction={{ xs: "column", md: "row" }} spacing={2.5}>
        <PlanCard
          name="Free"
          price="$0"
          period="forever"
          features={FREE_FEATURES}
          highlighted={!isPro}
          ctaLabel={isPro ? "Downgrade via portal" : "Current plan"}
          ctaDisabled
        />
        <PlanCard
          name="Pro"
          price="$12"
          period="per month"
          features={PRO_FEATURES}
          highlighted={isPro}
          ctaLabel={
            isPro ? "Current plan" : actionBusy ? "Opening…" : "Upgrade to Pro"
          }
          ctaDisabled={isPro || actionBusy}
          onCta={() => void onSubscribe()}
          accent
        />
      </Stack>
    </Stack>
  );
}

function PlanCard({
  name,
  price,
  period,
  features,
  highlighted,
  ctaLabel,
  ctaDisabled,
  onCta,
  accent,
}: {
  name: string;
  price: string;
  period: string;
  features: string[];
  highlighted: boolean;
  ctaLabel: string;
  ctaDisabled: boolean;
  onCta?: () => void;
  accent?: boolean;
}) {
  return (
    <Paper
      sx={{
        flex: 1,
        p: { xs: 2.5, sm: 3 },
        borderRadius: 3,
        border: "1px solid",
        borderColor: highlighted ? "primary.main" : "divider",
        boxShadow: highlighted
          ? "0 4px 24px rgba(8, 44, 246, 0.10)"
          : "0 1px 2px rgba(15, 23, 42, 0.04)",
        position: "relative",
      }}
    >
      <Stack spacing={2}>
        <Stack direction="row" alignItems="baseline" justifyContent="space-between">
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {name}
          </Typography>
          {highlighted ? (
            <Chip label="Current" size="small" color="primary" sx={{ fontWeight: 700 }} />
          ) : null}
        </Stack>
        <Stack direction="row" alignItems="baseline" spacing={1}>
          <Typography variant="h4" sx={{ fontWeight: 700, letterSpacing: "-0.5px" }}>
            {price}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {period}
          </Typography>
        </Stack>
        <Divider />
        <Stack spacing={1}>
          {features.map((f) => (
            <Stack key={f} direction="row" spacing={1} alignItems="center">
              <CheckCircleRoundedIcon
                fontSize="small"
                color={accent ? "primary" : "success"}
              />
              <Typography variant="body2">{f}</Typography>
            </Stack>
          ))}
        </Stack>
        <Button
          variant={accent && !ctaDisabled ? "contained" : "outlined"}
          size="large"
          disabled={ctaDisabled}
          onClick={onCta}
          sx={{ mt: 1 }}
        >
          {ctaLabel}
        </Button>
      </Stack>
    </Paper>
  );
}
