// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import Browser from 'webextension-polyfill';

import { ContentScriptConnection } from './ContentScriptConnection';
import { UiConnection } from './UiConnection';

import type { Connection } from './Connection';
import type { Permission } from '_payloads/permissions';

export class Connections {
    #connections: Connection[] = [];

    constructor() {
        Browser.runtime.onConnect.addListener((port) => {
            try {
                let connection: Connection;
                switch (port.name) {
                    case ContentScriptConnection.CHANNEL:
                        connection = new ContentScriptConnection(port);
                        break;
                    case UiConnection.CHANNEL:
                        connection = new UiConnection(port);
                        break;
                    default:
                        throw new Error(
                            `[Connections] Unknown connection ${port.name}`
                        );
                }
                this.#connections.push(connection);
                connection.onDisconnect.subscribe(() => {
                    const connectionIndex =
                        this.#connections.indexOf(connection);
                    if (connectionIndex >= 0) {
                        this.#connections.splice(connectionIndex, 1);
                    }
                });
            } catch (e) {
                port.disconnect();
            }
        });
    }

    public notifyForPermissionReply(permission: Permission) {
        for (const aConnection of this.#connections) {
            if (
                aConnection instanceof ContentScriptConnection &&
                aConnection.origin === permission.origin
            ) {
                aConnection.permissionReply(permission);
            }
        }
    }

    public notifyForLockedStatusUpdate(isLocked: boolean) {
        for (const aConnection of this.#connections) {
            if (aConnection instanceof UiConnection) {
                aConnection.sendLockedStatusUpdate(isLocked);
            }
        }
    }
}
