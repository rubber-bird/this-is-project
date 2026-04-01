import { useState } from 'react';
import { TextField, Button, Alert, Stack, Typography } from '@mui/material';

import { type User, signIn } from '../api';

export const Login = ({ onSuccess }: { onSuccess: (user: User) => void }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const user = await signIn({ email, password });
      onSuccess(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
    }
  };

  return (
    <Stack component="form" onSubmit={handleSubmit} spacing={2} sx={{ width: '100%' }}>
      <Typography variant="h5">Sign In</Typography>

      {error && <Alert severity="error">{error}</Alert>}

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
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <Button type="submit" variant="contained">
        Sign In
      </Button>
    </Stack>
  );
};
