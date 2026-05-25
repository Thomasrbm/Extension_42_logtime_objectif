const api = (typeof browser !== 'undefined')
  ? browser
  : chrome;

const $ = (id) =>
  document.getElementById(id);

async function populate() {

  const {
    login,
    uid,
    secret,
    monthlyGoal
  } = await api.storage.local.get([
    'login',
    'uid',
    'secret',
    'monthlyGoal'
  ]);

  $('input-login').value =
    login || '';

  $('input-uid').value =
    uid || '';

  $('input-secret').value =
    secret || '';

  $('input-goal').value =
    monthlyGoal || '';
}

async function save() {

  const login =
    $('input-login').value.trim();

  const uid =
    $('input-uid').value.trim();

  const secret =
    $('input-secret').value.trim();

  const monthlyGoal =
    parseFloat($('input-goal').value);

  await api.storage.local.set({
    login,
    uid,
    secret,
    monthlyGoal
  });

  await api.storage.local.remove(
    'tokenCache'
  );

  $('settings-status').textContent =
    'sauvegardé';

  $('settings-status').className =
    'settings-status ok';
}

async function test() {

  $('settings-status').textContent =
    'test...';

  await save();

  const login =
    $('input-login').value.trim();

  const resp =
    await api.runtime.sendMessage({
      type: 'TEST_CREDS',
      login
    });

  if (resp.ok) {

    $('settings-status').textContent =
      'credentials valides';

    $('settings-status').className =
      'settings-status ok';

  } else {

    $('settings-status').textContent =
      resp.error;

    $('settings-status').className =
      'settings-status err';
  }
}

document.addEventListener(
  'DOMContentLoaded',
  async () => {

    $('btn-save')
      .addEventListener('click', save);

    $('btn-test')
      .addEventListener('click', test);

    await populate();
  }
);