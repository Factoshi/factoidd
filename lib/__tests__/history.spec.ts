import { existsSync, writeFileSync, readFileSync } from 'fs';
import { createHeightJson, getStopHeight, scanBlockchain, saveHeight } from '../history';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';
import { factomEvent } from '../init';

const tmp = tmpdir();

test('should create height JSON', () => {
    const filename = randomBytes(4).toString('hex') + '.json';
    const file = tmp + '/' + filename;
    createHeightJson(file);
    const exists = existsSync(file);
    expect(exists).toStrictEqual(true);
    const heights = JSON.parse(readFileSync(file, 'utf8'));
    expect(heights).toEqual({ startHeight: 143400 });
});

test('should not overwrite height JSON if it already exists', () => {
    const filename = randomBytes(4).toString('hex') + '.json';
    const file = tmp + '/' + filename;
    writeFileSync(file, '{ "startHeight": 10 }');
    createHeightJson(file);
    const heights = JSON.parse(readFileSync(file, 'utf8'));
    expect(heights).toEqual({ startHeight: 10 });
});

test('should get stop height', async () => {
    const heights = await getStopHeight({ startHeight: 10 });
    expect(heights).toHaveProperty('stopHeight');
    expect(heights.stopHeight).toEqual(expect.any(Number));
    expect(heights.startHeight).toEqual(10);
});

test('should scan the blockchain', done => {
    factomEvent.once('newDirectoryBlock', dblock => {
        expect(dblock).toBeInstanceOf(Object);
        expect(dblock.height).toBe(10);
        done();
    });
    factomEvent.on('error', err => {
        factomEvent.removeAllListeners();
        done(err);
    });
    scanBlockchain({ startHeight: 10, stopHeight: 10 });
});

test('should save height', () => {
    const filename = randomBytes(4).toString('hex') + '.json';
    const file = tmp + '/' + filename;
    writeFileSync(file, '{ "startHeight": 10 }');
    saveHeight(11, file);
    const savedHeight = JSON.parse(readFileSync(file, 'utf8'));
    expect(savedHeight).toEqual({ startHeight: 11 });
});

test('should not save height', () => {
    const filename = randomBytes(4).toString('hex') + '.json';
    const file = tmp + '/' + filename;
    writeFileSync(file, '{ "startHeight": 10 }');
    saveHeight(9, file);
    const savedHeight = JSON.parse(readFileSync(file, 'utf8'));
    expect(savedHeight).toEqual({ startHeight: 10 });
});
