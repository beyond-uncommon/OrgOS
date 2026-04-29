"use client";

import * as React from "react";
import { Box, Button, CircularProgress, TextField, Typography } from "@mui/material";
import { useFormState, useFormStatus } from "react-dom";
import { login } from "@/lib/auth/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="contained"
      size="large"
      disabled={pending}
      startIcon={pending ? <CircularProgress size={16} color="inherit" /> : null}
      sx={{ mt: 0.5 }}
    >
      {pending ? "Signing in…" : "Sign in"}
    </Button>
  );
}

export function LoginForm() {
  const [state, action] = useFormState(login, null);

  return (
    <Box component="form" action={action} noValidate>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
        <Box>
          <Typography
            variant="overline"
            component="label"
            htmlFor="email"
            sx={{ color: "text.secondary", display: "block", mb: 1 }}
          >
            Email
          </Typography>
          <TextField
            id="email"
            name="email"
            type="email"
            placeholder="you@uncommon.org"
            fullWidth
            size="small"
            autoComplete="email"
            autoFocus
          />
        </Box>

        <Box>
          <Typography
            variant="overline"
            component="label"
            htmlFor="password"
            sx={{ color: "text.secondary", display: "block", mb: 1 }}
          >
            Password
          </Typography>
          <TextField
            id="password"
            name="password"
            type="password"
            placeholder="••••••••"
            fullWidth
            size="small"
            autoComplete="current-password"
          />
        </Box>

        {state?.error && (
          <Typography variant="body2" sx={{ color: "error.main" }}>
            {state.error}
          </Typography>
        )}

        <SubmitButton />
      </Box>
    </Box>
  );
}
