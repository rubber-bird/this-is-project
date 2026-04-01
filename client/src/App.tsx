import { useState } from 'react';
import { Container, Typography, Link, Stack } from '@mui/material';

import type { User } from './api';
import { Login } from './auth/Login';
import { SignUp } from './auth/SignUp';
import { EntryPage } from './entry/EntryPage';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<'login' | 'signup'>('login');

  if (user) {
    return <EntryPage user={user} onLogout={() => setUser(null)} />;
  }

  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      <Stack spacing={3} alignItems="center">
        <Typography variant="h4" fontWeight={500}>
          CSC 350 - Project 1
        </Typography>

        {view === 'login' ? (
          <>
            <Login onSuccess={setUser} />
            <Typography>
              No account?{' '}
              <Link component="button" onClick={() => setView('signup')}>
                Sign up
              </Link>
            </Typography>
          </>
        ) : (
          <>
            <SignUp onSuccess={() => setView('login')} />
            <Typography>
              Already have an account?{' '}
              <Link component="button" onClick={() => setView('login')}>
                Sign in
              </Link>
            </Typography>
          </>
        )}
      </Stack>
    </Container>
  );
}

export default App;
