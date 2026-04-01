import { useState } from 'react';
import { TextField, Button, Alert, Stack, Typography } from '@mui/material';

import { signUp } from '../api';

export const SignUp = ({ onSuccess }: { onSuccess: () => void }) => {
  const [givenName, setGivenName] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await signUp({ givenName, familyName, email, password });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign up failed');
    }
  };

  return (
    <Stack component="form" onSubmit={handleSubmit} spacing={2} sx={{ width: '100%' }}>
      <Typography variant="h5">Sign Up</Typography>

      {error && <Alert severity="error">{error}</Alert>}

      <TextField
        label="First Name"
        required
        value={givenName}
        onChange={(e) => setGivenName(e.target.value)}
      />
      <TextField
        label="Last Name"
        required
        value={familyName}
        onChange={(e) => setFamilyName(e.target.value)}
      />
      <TextField
        label="Email"
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <TextField
        label="Password"
        type="password"
        required
        slotProps={{ htmlInput: { minLength: 6 } }}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <Button type="submit" variant="contained">
        Sign Up
      </Button>
    </Stack>
  );
};
