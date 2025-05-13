import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { MultimediaEntry } from 'src/app/core/domain/models/multimedia-entry.model';
import { LoadingController } from '@ionic/angular/standalone';

@Injectable({
  providedIn: 'root'
})
export class WidgetService {
  private readonly WIDGET_KEY = 'widget_data';

  constructor(private loadingController: LoadingController) {}

  async updateWidgetData(entries: MultimediaEntry[]) {
    const sortedEntries = [...entries].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    await Preferences.set({
      key: this.WIDGET_KEY,
      value: JSON.stringify(sortedEntries)
    });
  }

  async getCurrentWidgetData(): Promise<MultimediaEntry[]> {
    const { value } = await Preferences.get({ key: this.WIDGET_KEY });
    return value ? JSON.parse(value) : [];
  }

  async showLoading(message: string) {
    const loading = await this.loadingController.create({
      message,
      spinner: 'crescent'
    });
    await loading.present();
    return loading;
  }
}