 function switchTab(tab) {
      ['login', 'register'].forEach(t => {
        document.getElementById(`tab-${t}`).classList.toggle('active', t === tab);
        document.getElementById(`tab-${t}`).setAttribute('aria-selected', t === tab);
        document.getElementById(`pane-${t}`).classList.toggle('active', t === tab);
      });
      // Clear alerts on switch
      document.querySelectorAll('.alert-auth').forEach(el => {
        el.style.display = 'none';
        el.textContent = '';
      });
    }

    function togglePassword(id, btn) {
      const input = document.getElementById(id);
      const isText = input.type === 'text';
      input.type = isText ? 'password' : 'text';
      btn.textContent = isText ? '👁' : '🔒';
      btn.setAttribute('aria-label', isText ? 'Passwort anzeigen' : 'Passwort verbergen');
    }

    function showAlert(elId, message, type) {
      const el = document.getElementById(elId);
      el.textContent = message;
      el.className = `alert-auth alert-${type}`;
      el.style.display = 'block';
    }

    function checkStrength(pw) {
      const fill = document.getElementById('strength-fill');
      let score = 0;
      if (pw.length >= 8) score++;
      if (pw.length >= 12) score++;
      if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
      if (/\d/.test(pw)) score++;
      if (/[^A-Za-z0-9]/.test(pw)) score++;

      const pct = Math.min(score * 20, 100);
      fill.style.width = pct + '%';
      fill.style.background = score <= 1 ? '#e74c3c' : score <= 3 ? '#f39c12' : '#27ae60';
    }

    async function handleLogin() {
      const username = document.getElementById('login-username').value.trim();
      const password = document.getElementById('login-password').value;
      const btn = document.getElementById('login-btn');

      if (!username || !password) {
        showAlert('login-alert', 'Bitte Benutzername und Passwort eingeben.', 'danger');
        return;
      }

      btn.disabled = true;
      btn.textContent = 'Anmelden…';

      try {
        const res = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });

        const data = await res.json();

        if (res.status === 401) {
          showAlert('login-alert', 'Falsches Passwort oder Benutzername nicht gefunden.', 'danger');
          return;
        }

        if (!res.ok) {
          showAlert('login-alert', data.error || 'Ein Fehler ist aufgetreten.', 'danger');
          return;
        }

        if (data.success) {
          showAlert('login-alert', 'Anmeldung erfolgreich! Weiterleitung…', 'success');
          setTimeout(() => { window.location.href = '/'; }, 800);
        }
      } catch (err) {
        showAlert('login-alert', 'Netzwerkfehler – bitte erneut versuchen.', 'danger');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Anmelden';
      }
    }

    async function handleRegister() {
      const username = document.getElementById('reg-username').value.trim();
      const password = document.getElementById('reg-password').value;
      const password2 = document.getElementById('reg-password2').value;
      const btn = document.getElementById('register-btn');

      if (!username || !password) {
        showAlert('register-alert', 'Bitte alle Felder ausfüllen.', 'danger');
        return;
      }

      if (password.length < 8) {
        showAlert('register-alert', 'Das Passwort muss mindestens 8 Zeichen lang sein.', 'danger');
        return;
      }

      if (password !== password2) {
        showAlert('register-alert', 'Die Passwörter stimmen nicht überein.', 'danger');
        document.getElementById('reg-password2').classList.add('is-invalid');
        return;
      }

      document.getElementById('reg-password2').classList.remove('is-invalid');
      btn.disabled = true;
      btn.textContent = 'Konto wird erstellt…';

      try {
        const res = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });

        const data = await res.json();

        if (res.status === 401) {
          showAlert('register-alert', 'Dieser Benutzername ist bereits vergeben.', 'danger');
          return;
        }

        if (!res.ok) {
          showAlert('register-alert', data.error || 'Registrierung fehlgeschlagen.', 'danger');
          return;
        }

        if (data.success) {
          showAlert('register-alert', 'Konto erstellt! Weiterleitung…', 'success');
          setTimeout(() => { window.location.href = '/'; }, 800);
        }
      } catch (err) {
        showAlert('register-alert', 'Netzwerkfehler – bitte erneut versuchen.', 'danger');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Konto erstellen';
      }
    }

    // Submit on Enter
    document.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        const loginActive = document.getElementById('pane-login').classList.contains('active');
        if (loginActive) handleLogin();
        else handleRegister();
      }
    });