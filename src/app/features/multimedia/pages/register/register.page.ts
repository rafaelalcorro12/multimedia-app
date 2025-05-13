import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Preferences } from '@capacitor/preferences';
import { AlertController } from '@ionic/angular/standalone';
import { MultimediaRepository } from 'src/app/core/data/repositories/multimedia.repository';
import { SupabaseService } from 'src/app/shared/services/supabase.service';
import { WidgetService } from 'src/app/shared/services/widget.service';
import { MultimediaEntry } from 'src/app/core/domain/models/multimedia-entry.model';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule]
})
export class RegisterPage {
  imagePreview: string | null = null;
  imageFile: File | null = null;
  description = '';

  constructor(
    private repository: MultimediaRepository,
    private supabase: SupabaseService,
    private widgetService: WidgetService,
    private alertController: AlertController
  ) {}

  async captureImage() {
    try {
      const alert = await this.alertController.create({
        header: 'Seleccionar imagen',
        message: '¿De dónde deseas obtener la imagen?',
        buttons: [
          {
            text: 'Cámara',
            handler: () => this.getImageFromCamera()
          },
          {
            text: 'Galeria/Archivos',
            handler: () => this.getImageFromFiles()
          },
          {
            text: 'Cancelar',
            role: 'cancel'
          }
        ]
      });
      await alert.present();
    } catch (error) {
      console.error('Error al seleccionar imagen:', error);
      await this.showErrorMessage('Error al seleccionar imagen');
    }
  }

  private async getImageFromCamera() {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: true,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera
      });
      this.handleImageSelection(image.dataUrl);
    } catch (error) {
      console.error('Error al tomar foto:', error);
      if ((error as any).message !== 'User cancelled photos app') {
        await this.showErrorMessage('Error al acceder a la cámara');
      }
    }
  }

  private async getImageFromFiles() {
    if (this.isWebPlatform()) {
      try {
        await this.getImageFromFileInput();
      } catch (error) {
        console.error('Error al seleccionar archivo:', error);
        await this.showErrorMessage('Error al seleccionar archivo');
      }
    } else {
      try {
        const image = await Camera.getPhoto({
          quality: 90,
          allowEditing: true,
          resultType: CameraResultType.DataUrl,
          source: CameraSource.Photos
        });
        this.handleImageSelection(image.dataUrl);
      } catch (error) {
        console.error('Error al acceder a galería:', error);
        if ((error as any).message !== 'User cancelled photos app') {
          await this.showErrorMessage('Error al acceder a la galería');
        }
      }
    }
  }

  private async getImageFromFileInput() {
    return new Promise<void>((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      
      input.onchange = (event: any) => {
        const file = event.target.files[0];
        if (!file) {
          reject('No se seleccionó ningún archivo');
          return;
        }

        const reader = new FileReader();
        reader.onload = (e: any) => {
          this.imagePreview = e.target.result;
          this.imageFile = file;
          resolve();
        };
        reader.onerror = () => reject('Error al leer el archivo');
        reader.readAsDataURL(file);
      };
      
      input.click();
    });
  }

  private handleImageSelection(dataUrl: string | undefined) {
    if (dataUrl) {
      this.imagePreview = dataUrl;
      this.imageFile = this.dataUrlToFile(dataUrl);
    }
  }

  async onSubmit() {
  if (!this.imageFile || !this.description) return;

  try {
    const loading = await this.widgetService.showLoading('Guardando...');
    
    const imageUrl = await this.supabase.uploadImage(this.imageFile);
    
    const newEntry: MultimediaEntry = {
      imageUrl,
      description: this.description,
      createdAt: new Date().toISOString()
    };

    await this.repository.saveEntry(newEntry);
    
    const currentEntries = await this.widgetService.getCurrentWidgetData();
    await this.widgetService.updateWidgetData([...currentEntries, newEntry]);
    
    await loading.dismiss();
    await this.showSuccessMessage();
    this.resetForm();
  } catch (error) {
    console.error('Error al guardar:', error);
    await this.showErrorMessage('Error al guardar el registro');
  }
}

  private async showSuccessMessage() {
    const alert = await this.alertController.create({
      header: 'Éxito',
      message: 'Registro guardado correctamente',
      buttons: ['OK']
    });
    await alert.present();
  }

  private async showErrorMessage(message: string) {
    const alert = await this.alertController.create({
      header: 'Error',
      message: message,
      buttons: ['OK']
    });
    await alert.present();
  }

  private dataUrlToFile(dataUrl: string): File {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)![1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);
    return new File([u8arr], `image_${Date.now()}.jpg`, { type: mime });
  }

  private resetForm() {
    this.imagePreview = null;
    this.imageFile = null;
    this.description = '';
  }

  private isWebPlatform(): boolean {
    return !(window as any).capacitor;
  }
}