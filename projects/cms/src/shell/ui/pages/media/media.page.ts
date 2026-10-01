import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MediaLibraryComponent } from '../../media/media-library/media-library.component';

/** "Imágenes": the site's library, to upload and delete photos and icons. */
@Component({
  selector: 'cms-media-page',
  imports: [MediaLibraryComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './media.page.html',
  styleUrl: './media.page.css',
})
export class MediaPage {}
