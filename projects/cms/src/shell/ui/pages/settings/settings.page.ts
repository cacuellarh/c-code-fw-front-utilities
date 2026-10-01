import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { findCollection } from '../../../../domain/content';
import { countOf } from '../../../../domain/labels';
import { ImportReport } from '../../../../domain/media';
import { NewSite } from '../../../../domain/ports';
import { CollectionDef } from '../../../../domain/schema';
import { canPickFolders } from '../../../adapters/fs-site-files';
import { DialogService } from '../../../state/dialog.service';
import { EditorService } from '../../../state/editor.service';
import { MediaService } from '../../../state/media.service';
import { ToastService } from '../../../state/toast.service';
import { IconComponent } from '../../icon/icon.component';
import { errorMessage } from '../../messages';

type SectionState = 'active' | 'hidden' | 'available';

const STATE_LABELS: Record<SectionState, { label: string; tone: string }> = {
  active: { label: 'Activa', tone: 'success' },
  hidden: { label: 'No usada', tone: '' },
  available: { label: 'Disponible', tone: 'warning' },
};

/**
 * Admin: everything that is done once per site or only by C-Code. Name, publishing, which
 * sections the site uses, and importing from the project folder.
 */
@Component({
  selector: 'cms-settings-page',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './settings.page.html',
  styleUrl: './settings.page.css',
})
export class SettingsPage implements OnInit {
  protected editor = inject(EditorService);
  protected media = inject(MediaService);
  private dialogs = inject(DialogService);
  private toast = inject(ToastService);
  private router = inject(Router);

  protected readonly canPick = canPickFolders();
  protected readonly stateLabels = STATE_LABELS;
  protected readonly name = signal('');
  protected readonly hook = signal('');
  protected readonly savedHook = signal('');
  protected readonly sections = signal<{ def: CollectionDef; state: SectionState }[]>([]);
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly report = signal<ImportReport | null>(null);
  protected readonly replaceTarget = signal('');
  protected readonly replaceNotice = signal('');
  protected readonly legacy = computed(() => (this.editor.content() ? this.media.legacyCount() : 0));

  async ngOnInit(): Promise<void> {
    this.name.set(this.editor.site()?.name ?? '');
    this.replaceTarget.set(this.editor.collections()[0]?.def.id ?? '');
    try {
      const hook = await this.editor.getDeployHook();
      this.hook.set(hook);
      this.savedHook.set(hook);
      await this.loadSections();
    } catch (e) {
      this.error.set(errorMessage(e, true));
    }
  }

  // General

  protected async saveName(): Promise<void> {
    await this.task(async () => {
      await this.editor.rename(this.name());
      this.toast.show('Nombre guardado.');
    });
  }

  // Publishing

  protected async saveHook(): Promise<void> {
    await this.task(async () => {
      await this.editor.setDeployHook(this.hook());
      this.savedHook.set(this.hook().trim());
      this.toast.show('Enlace de publicación guardado.');
    });
  }

  // Sections

  protected count(def: CollectionDef): string {
    const data = this.editor.content() && findCollection(this.editor.content()!, def.id);
    if (!data) return '';
    return def.single ? '' : countOf(def, data.items.length);
  }

  protected async remove(def: CollectionDef): Promise<void> {
    if (!(await this.noUnsavedChanges())) return;
    const data = findCollection(this.editor.content()!, def.id);
    const what = def.single || !data ? 'su contenido' : countOf(def, data.items.length);
    const ok = await this.dialogs.confirm({
      title: `¿Quitar ${def.label}?`,
      body: `Se borra ${what} (queda una copia en el historial). Al publicar, el sitio dejará de mostrarlo.`,
      confirm: 'Quitar',
      tone: 'danger',
    });
    if (!ok) return;
    await this.task(async () => {
      await this.editor.removeSection(def);
      await this.loadSections();
      this.toast.show(`${def.label}: quitada.`);
    });
  }

  protected async addEmpty(def: CollectionDef): Promise<void> {
    if (!(await this.noUnsavedChanges())) return;
    await this.task(async () => {
      await this.editor.addSection(def);
      await this.router.navigate(['/sitio', this.editor.site()?.id, def.id]);
    });
  }

  protected async hide(def: CollectionDef): Promise<void> {
    if (!(await this.noUnsavedChanges())) return;
    await this.task(async () => {
      await this.editor.hideSection(def);
      await this.loadSections();
    });
  }

  protected async offer(def: CollectionDef): Promise<void> {
    await this.task(async () => {
      await this.editor.offerSection(def);
      await this.loadSections();
    });
  }

  protected async importSection(def: CollectionDef): Promise<void> {
    if (!(await this.noUnsavedChanges())) return;
    const folder = await this.pickFolder();
    if (!folder) return;
    await this.task(async () => {
      const imported = await this.editor.importSections(folder.site, [def.id]);
      if (!imported.length) throw new Error(`La carpeta «${folder.name}» no tiene el archivo de ${def.label}.`);
      await this.loadSections();
      this.toast.show(`${def.label}: importada.`);
    });
  }

  // Import

  /** Imports the old images from the published site, or from the project folder. */
  protected async importImages(fromFolder: boolean): Promise<void> {
    let handle: FileSystemDirectoryHandle | undefined;
    if (fromFolder) {
      try {
        handle = await window.showDirectoryPicker({ id: 'cms-site', mode: 'read' });
      } catch {
        return; // The user closed the picker.
      }
      const site = await this.editor.readFolder(handle).catch(() => null);
      if (site && !(await this.sameSite(site))) return;
    }
    this.report.set(null);
    await this.task(async () => this.report.set(await this.media.importFromSite(handle)));
  }

  protected async replaceSection(): Promise<void> {
    const def = this.editor.collection(this.replaceTarget())?.def;
    if (!def) return;
    const folder = await this.pickFolder();
    if (!folder) return;
    this.replaceNotice.set('');
    await this.task(async () => {
      const { before, after } = this.editor.replaceFromFolder(def.id, folder.site);
      this.replaceNotice.set(`${def.label}: cargado desde «${folder.name}», ${after} en lugar de ${before}. Sin guardar.`);
    });
  }

  protected async openSection(id: string): Promise<void> {
    await this.router.navigate(['/sitio', this.editor.site()?.id, id]);
  }

  private async pickFolder(): Promise<{ name: string; site: Omit<NewSite, 'id'> } | null> {
    let handle: FileSystemDirectoryHandle;
    try {
      handle = await window.showDirectoryPicker({ id: 'cms-site', mode: 'read' });
    } catch {
      return null; // The user closed the picker.
    }
    try {
      const site = await this.editor.readFolder(handle);
      return (await this.sameSite(site)) ? { name: handle.name, site } : null;
    } catch (e) {
      this.error.set(`${handle.name}: ${errorMessage(e, true)}`);
      return null;
    }
  }

  /** Asks before using a folder that seems to be another site's. */
  private async sameSite(site: Omit<NewSite, 'id'>): Promise<boolean> {
    const warning = this.editor.folderWarning(site);
    return !warning || this.dialogs.confirm({ title: '¿Es la carpeta correcta?', body: warning, confirm: 'Usarla igual', tone: 'danger' });
  }

  /** Section changes reload the site, so unsaved edits would be lost. */
  private async noUnsavedChanges(): Promise<boolean> {
    if (!this.editor.dirty().length) return true;
    await this.dialogs.alert({ title: 'Hay cambios sin guardar', body: 'Guarda o descarta los cambios antes de cambiar las secciones.' });
    return false;
  }

  private async loadSections(): Promise<void> {
    this.sections.set(await this.editor.sectionStates());
  }

  private async task(run: () => Promise<void>): Promise<void> {
    this.busy.set(true);
    this.error.set('');
    try {
      await run();
    } catch (e) {
      this.error.set(errorMessage(e, true));
    } finally {
      this.busy.set(false);
    }
  }
}
