import { AccessLevel, SingletonProto, Inject } from '@eggjs/tegg';
import { NFSAdapter } from '../common/adapter/NFSAdapter';
import { PackageRepository } from './PackageRepository';
import { Dist } from '../core/entity/Dist';

@SingletonProto({
  accessLevel: AccessLevel.PUBLIC,
})
export class DistRepository {
  @Inject()
  private packageRepository: PackageRepository;

  @Inject()
  private readonly nfsAdapter: NFSAdapter;

  async findPackageVersionManifest(packageId: string, version: string) {
    const packageVersion = await this.packageRepository.findPackageVersion(packageId, version);
    if (packageVersion) {
      const [ packageVersionJson, readme ] = await Promise.all([
        this.readDistBytesToJSON(packageVersion.manifestDist),
        this.readDistBytesToString(packageVersion.readmeDist),
      ]);
      packageVersionJson.readme = readme;
      return packageVersionJson;
    }
  }

  async findPackageAbbreviatedManifest(packageId: string, version: string) {
    const packageVersion = await this.packageRepository.findPackageVersion(packageId, version);
    if (packageVersion) {
      return await this.readDistBytesToJSON(packageVersion.abbreviatedDist);
    }
  }

  async readDistBytesToJSON(dist: Dist) {
    const str = await this.readDistBytesToString(dist);
    if (str) {
      return JSON.parse(str);
    }
  }

  async readDistBytesToString(dist: Dist): Promise<string> {
    const bytes = await this.readDistBytes(dist);
    if (!bytes) return '';
    return Buffer.from(bytes).toString('utf8');
  }

  async readDistBytes(dist: Dist): Promise<Uint8Array | undefined> {
    return await this.nfsAdapter.getBytes(dist.path);
  }

  async saveDist(dist: Dist, buf: Buffer | Uint8Array | string) {
    if (typeof buf === 'string') {
      return await this.nfsAdapter.uploadFile(dist.path, buf);
    }
    return await this.nfsAdapter.uploadBytes(dist.path, buf);
  }

  async destroyDist(dist: Dist) {
    return await this.nfsAdapter.remove(dist.path);
  }

  async downloadDist(dist: Dist) {
    return await this.nfsAdapter.getDownloadUrlOrStream(dist.path);
  }
}
