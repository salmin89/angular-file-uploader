import { Component, EventEmitter, Input, Output, ViewChild } from "@angular/core";
import { combineLatest, fromEvent, Observable,  Observer, of, Subject } from "rxjs";
import { catchError, filter,  map, switchMap,  take, takeUntil, tap } from "rxjs/operators";
import { IUploadedFile, IVerifiedFile } from "../models/uploaded-file.model";

const INVALID_FILE = ' Invalid file.';
const INVALID_IMAGE = ' Invalid image.';
const INVALID_SIZE = ' File too large.';


@Component({
  selector: "app-file-uploader",
  templateUrl: "./file-uploader.component.html",
  styleUrls: ["./file-uploader.component.css"]
})
export class FileUploaderComponent {

  @Input() fileSizeLimit = 51200;
  @Input() initialValues: IUploadedFile[];

  @Output() onFileChanges = new EventEmitter<IVerifiedFile[]>();

  @ViewChild('fileInput') fileInputRef;

  files$: Observable<IUploadedFile[]>;

  unsubscribe = new Subject<void>();
  ngOnDestroy(): void {
    this.unsubscribe.next();
    this.unsubscribe.complete();
  }

  ngOnInit() {
  }

  ngAfterViewInit() {
    this.files$ = fromEvent(this.fileInputRef.nativeElement, 'change').pipe(
      map((event: any) => event?.target?.files),
      filter((files: FileList) => files.length > 0),
      switchMap((files) => {
        const validatedFiles: Observable<IUploadedFile>[] = []

        for (const file of Object.values(files)) {
          validatedFiles.push(this.validateFile(file).pipe(catchError((error: IUploadedFile) => of(error))))
        }
        return combineLatest(validatedFiles);
      }),
    )

    this.files$.pipe(
        takeUntil(this.unsubscribe),
        map((uploadedFiles: IUploadedFile[]) => uploadedFiles.filter(files => !files.error))
    ).subscribe(result => {
      this.onFileChanges.emit(result);
    });

  
  }

  private validateFile(file: File): Observable<IUploadedFile> {
    const fileReader = new FileReader();
    
    return new Observable((observer: Observer<IUploadedFile>) => {
      
      this.validateSize(file, observer);

      fileReader.readAsDataURL(file);
      fileReader.onload = event => {
        this.validateFileType(file, fileReader, observer);
      };
      fileReader.onerror = () => {
        console.log('onerror')
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
            // This won't load unless we display it
            observer.error({ error: { name, errorMessage: INVALID_IMAGE } });
          };
          image.src = fileReader.result as string;
        } else {
          observer.error({ error: { name, errorMessage: INVALID_IMAGE } });
          observer.complete();
        }
  }

  private validateSize(file: File, observer: Observer<IUploadedFile>): void {
    const {name, size} = file;
    if (size > this.fileSizeLimit) observer.error({error: {name, errorMessage: INVALID_SIZE}});
  }

  
}
