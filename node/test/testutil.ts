import path = require('path');
import util = require('util');
import stream = require('stream');
import os = require('os');
import child = require('child_process');
import shell = require('shelljs');
import fs = require('fs');

import * as tl from '../_build/task';

export function initialize() {
    tl.setStdStream(this.getNullStream());
    tl.setErrStream(this.getNullStream());
    tl.setEnvVar('TASKLIB_INPROC_UNITS', '1');

    tl.mkdirP(this.getTestTemp());
}

export function getTestTemp() {
    return path.join(__dirname, '_temp');
}

var NullStream = function () {
    stream.Writable.call(this);
    this._write = function (data, encoding, next) {
        next();
    }
}
util.inherits(NullStream, stream.Writable);

export function getNullStream() {
    return new NullStream();    
}

var StringStream = function () {
    var contents = '';

    stream.Writable.call(this);
    this._write = function (data, encoding, next) {
        contents += data;
        next();
    }

    this.getContents = function () {
        return contents.toString();
    }
}
util.inherits(StringStream, stream.Writable);

export function createStringStream() {
    return new StringStream();    
}

export function buildOutput(lines: string[]): string {
    var output = '';
    lines.forEach(function (line) {
        output += line + os.EOL;
    });

    return output;
}

export function createHiddenDirectory(dir: string): void {
    if (!path.basename(dir).match(/^\./)) {
        throw new Error(`Expected dir '${dir}' to start with '.'.`);
    }

    shell.mkdir('-p', dir);
    if (os.platform() == 'win32') {
        let result = child.spawnSync('attrib.exe', [ '+H', dir ]);
        if (result.status != 0) {
            let message: string = (result.output || []).join(' ').trim();
            throw new Error(`Failed to set hidden attribute for directory '${dir}'. ${message}`);
        }
    }
};

export function createHiddenFile(file: string, content: string): void {
    if (!path.basename(file).match(/^\./)) {
        throw new Error(`Expected dir '${file}' to start with '.'.`);
    }

    shell.mkdir('-p', path.dirname(file));
    fs.writeFileSync(file, content);
    if (os.platform() == 'win32') {
        let result = child.spawnSync('attrib.exe', [ '+H', file ]);
        if (result.status != 0) {
            let message: string = (result.output || []).join(' ').trim();
            throw new Error(`Failed to set hidden attribute for file '${file}'. ${message}`);
        }
    }
};

/**
 * Creates a symlink directory on OSX/Linux, and a junction point directory on Windows.
 * A symlink directory is not created on Windows since it requires an elevated context.
 */
export function createSymlinkDir(real: string, link: string): void {
    if (os.platform() == 'win32') {
        let result = child.spawnSync('cmd.exe', [ '/c', 'mklink', '/J', link, real ]);
        if (result.status != 0) {
            let message: string = (result.output || []).join(' ').trim();
            throw new Error(`Failed to create junction point '${link}' for directory '${real}'. ${message}`);
        }
    }
    else {
        fs.symlinkSync(real, link);
    }
};