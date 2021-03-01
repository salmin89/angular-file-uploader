import { Component, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { BehaviorSubject, combineLatest, forkJoin,  fromEvent, Observable, Observer, of, ReplaySubject,  Subject } from 'rxjs';
import { catchError, filter, map, shareReplay,  startWith,    switchMap, take, takeUntil, tap, withLatestFrom } from 'rxjs/operators';
import { IUploadedFile, IVerifiedFile } from '../models/uploaded-file.model';

const INVALID_FILE = ' Invalid file.';
const INVALID_IMAGE = ' Invalid image.';
const INVALID_SIZE = ' File too large.';

@Component({
  selector: 'app-file-uploader',
  templateUrl: './file-uploader.component.html',
})
export class FileUploaderComponent {
  @Input() fileSizeLimit = 51200;
  @Input() initialValues: IUploadedFile[] = []

  @Output() onFileChanges = new EventEmitter<IVerifiedFile[]>();

  @ViewChild('fileInput') fileInputRef;

  files$: Observable<IUploadedFile[]>;
  removed$ = new BehaviorSubject([]);

  unsubscribe = new Subject<void>();
  ngOnDestroy(): void {
    this.unsubscribe.next();
    this.unsubscribe.complete();
  }


  ngAfterViewInit() {
    // Everytime the file input changes we trigger this event and validate the files
    const fileChanges$ = fromEvent(this.fileInputRef.nativeElement, 'change').pipe(
      map((event: any) => event?.target?.files),
      filter((files: FileList) => files.length > 0),
      switchMap((files) => {
        // Validate
        const validatedFiles: Observable<IUploadedFile>[] = [];

        for (const file of Object.values(files)) {
          validatedFiles.push(this.validateFile(file).pipe(catchError((error: IUploadedFile) => of(error))));
        }
        return combineLatest(validatedFiles);
      }),
      startWith(this.initialValues),
      shareReplay()
    );

    // The result-items in the UI
    this.files$ = combineLatest([
      fileChanges$, 
      this.removed$])
    .pipe(
        map(([fileChanges, removedFiles]) => {
          return fileChanges.filter(file => !removedFiles.find(r => r === file))
      }),
      shareReplay()
    )
    

    // Emit values
    combineLatest([
      fileChanges$,
      this.removed$
    ]).pipe(
        takeUntil(this.unsubscribe),
        filter(([fileChanges, removed]) => !fileChanges || removed.length > 0),
        map(([fileChanges, removedFiles]) => {
          return fileChanges.filter(file => !removedFiles.find(r => r === file) && !file.error)
        })
      )
      .subscribe((result) => {
        console.log('EMITTING RESULT', result)
        this.onFileChanges.emit(result);
      });
  }

  private validateFile(file: File): Observable<IUploadedFile> {
    const fileReader = new FileReader();

    return new Observable((observer: Observer<IUploadedFile>) => {
      this.validateSize(file, observer);

      fileReader.readAsDataURL(file);
      fileReader.onload = (event) => {
        this.validateFileType(file, fileReader, observer);
      };
      fileReader.onerror = () => {
        observer.error({ error: { name: file.name, errorMessage: INVALID_FILE } });
      };
    });
  }

  private isImage(mimeType: string): boolean {
    return mimeType.match(/image\/*/) !== null;
  }

  private validateFileType(file: File, fileReader: FileReader, observer: Observer<IUploadedFile>): void {
    const { type, name } = file;
    if (this.isImage(type)) {
      const image = new Image();
      image.onload = () => {
        observer.next({ file, image });
        observer.complete();
      };
      image.onerror = () => {
        // image.onerror only triggers if the image is corrupt and won't load
        observer.error({ error: { name, errorMessage: INVALID_IMAGE } });
      };
      image.src = fileReader.result as string;
    } else {
      // it's not an image
      observer.error({ error: { name, errorMessage: INVALID_IMAGE } });
      observer.complete();
    }
  }

  private validateSize(file: File, observer: Observer<IUploadedFile>): void {
    const { name, size } = file;
    if (size > this.fileSizeLimit) observer.error({ error: { name, errorMessage: INVALID_SIZE } });
  }

  public remove(file) {
    this.removed$.next([...this.removed$.value, file])
  }

  public removeInitial(file) {
    this.initialValues = this.initialValues.filter(f => file !== f)
    this.onFileChanges.emit(this.initialValues)
  }
}
