import assert from 'node:assert/strict';
import { init as initTestServer } from './helpers/testServer.ts';
import * as plugins from '../src/lib/plugins.ts';

describe('[PLGX] Plugins', () => {
  before(async () => {
    await initTestServer(); // will init plugins
  });

  it('[PLGP] Unit: get list of streams to create', async () => {
    // only test sample plugin
    const { streams, permissions } = plugins.requiredPermissionsAndStreams();
    const permissionsSample = permissions.filter((p: Record<string, unknown>) => p.streamId === 'body-weight');
    const streamsSample = streams.filter((s: Record<string, unknown>) => s.id === 'body-weight' || s.id === 'body');
    assert.deepEqual({ permissionsSample, streamsSample }, {
      permissionsSample: [
        {
          streamId: 'body-weight',
          level: 'manage',
          defaultName: 'Body Weight'
        }
      ],
      streamsSample: [
        { id: 'body', parentId: null, name: 'Body' },
        { id: 'body-weight', parentId: 'body', name: 'Body Weight' }
      ]
    });
  });
});
