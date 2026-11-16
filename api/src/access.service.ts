import { Injectable } from '@nestjs/common';
import { User } from './generated/prisma/client';
import fs from 'node:fs';
import path from 'node:path';

type Operation = 'read' | 'write';
type Rule = { path: string; read?: string; write?: string; segs: string[] };
const levels: Record<string, number> = { view: 1, interact: 2, admin: 3, owner: 4 };
export const segmentPattern = /^(?!\.\.?$)[A-Za-z0-9_\-.~:@+]{1,200}$/;

@Injectable()
export class AccessService {
  private readonly rules: Rule[];

  constructor() {
    const candidates = [path.join(process.cwd(), 'api', 'rules.json'), path.join(process.cwd(), 'rules.json')];
    const file = candidates.find((candidate) => fs.existsSync(candidate));
    if (!file) throw new Error('rules.json não encontrado');
    this.rules = JSON.parse(fs.readFileSync(file, 'utf8')).map((rule: Rule) => ({ ...rule, segs: rule.path.split('/') }));
  }

  level(user: User) { return user.role === 'owner' ? 4 : user.role === 'editor' ? 3 : 2; }
  validCollection(collection: unknown) {
    const segments = String(collection || '').split('/');
    return segments.length % 2 === 1 && segments.length <= 15 && segments.every((part) => segmentPattern.test(part));
  }

  can(user: User, documentPath: string, operation: Operation) {
    const segments = documentPath.split('/');
    const collection = segments[0], id = segments[1];
    const admin = this.level(user) >= 3;
    if (!admin && !user.memberId && !['members', 'access_req'].includes(collection)) return false;
    if (collection === 'access_log') return admin;
    if (collection === 'access_req') return admin || id === user.id;
    if (collection === 'members' && operation === 'write')
      return admin || (!!user.memberId && id === user.memberId);
    if (segments[0] === 'data' && segments[1] === 'users') return segments[2] === user.id;
    if (this.isPrivateForAnotherUser(segments, user.id)) return false;
    const writeRule = this.deepest(segments, 'write', user.id);
    const canWrite = this.level(user) >= levels[writeRule?.write || 'interact'];
    if (operation === 'write') return canWrite;
    const readRule = this.deepest(segments, 'read', user.id);
    return this.level(user) >= levels[readRule?.read || 'view'] || canWrite;
  }

  private deepest(segments: string[], operation: Operation, userId: string) {
    return this.rules.filter((rule) => operation in rule && rule.segs.length <= segments.length && rule.segs.every((part, index) => part === '{self}' ? segments[index] === userId : part === segments[index]))
      .sort((a, b) => b.segs.length - a.segs.length)[0];
  }

  private isPrivateForAnotherUser(segments: string[], userId: string) {
    return this.rules.some((rule) => {
      const index = rule.segs.length - 1;
      if (rule.segs[index] !== '{self}' || segments.length <= index || segments[index] === userId) return false;
      const prefixMatches = rule.segs.slice(0, index).every((part, partIndex) => part === segments[partIndex]);
      const hasParentRule = this.rules.some((other) => other.segs.length === index && other.segs.every((part, partIndex) => part === segments[partIndex]));
      return prefixMatches && !hasParentRule;
    });
  }
}
