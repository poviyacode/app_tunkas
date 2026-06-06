import { Pipe, PipeTransform } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Pipe({
    name: 'dateAgo',
    standalone: true
})
export class DateAgoPipe implements PipeTransform {
    constructor(private translate: TranslateService) { }

    transform(date: string): string {
        // Convertir la fecha ISO a un objeto Date
        const pastDate = new Date(date);
        const now = new Date();

        // Calcular la diferencia en segundos
        const diffInSeconds = Math.floor((now.getTime() - pastDate.getTime()) / 1000);

        // Si la diferencia es negativa, significa que la fecha está en el futuro
        if (diffInSeconds < 0) {
            return this.translate.instant('inTheFuture');
        }

        // Definir las unidades de tiempo en segundos
        const intervals = {
            timeyear: 31536000,
            timemonth: 2592000,
            timeweek: 604800,
            timeday: 86400,
            timehour: 3600,
            timeminute: 60,
            timesecond: 1
        };

        // Iterar sobre las unidades de tiempo
        for (const [unit, secondsInUnit] of Object.entries(intervals)) {
            const value = Math.floor(diffInSeconds / secondsInUnit);
            if (value >= 1) {
                // Determinar si es singular o plural
                const key = value === 1 ? unit : `${unit}_plural`;
                return this.translate.instant(key, { count: value });
            }
        }

        // Si no hay coincidencia, devolver "just now" o su equivalente traducido
        return this.translate.instant('justNow');
    }
}