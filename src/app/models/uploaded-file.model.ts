export type IVerifiedFile = Omit<IUploadedFile, "error">;

export interface IUploadedFile {
  file?: File;
  image?: HTMLImageElement;
  error?: IUploadError;
}

export interface IUploadError {
  name: string;
  errorMessage: string;
}

type Test = Omit<IUploadedFile, "error">;
