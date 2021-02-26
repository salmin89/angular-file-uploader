export type IVerifiedFile = Omit<IUploadedFile, "error">;

export interface IUploadedFile {
  file?: File;
  image?: Partial<HTMLImageElement>;
  error?: IUploadError;
}

export interface IUploadError {
  name: string;
  errorMessage: string;
}

type Test = Omit<IUploadedFile, "error">;
