import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function DialogDemo() {
  const [openSmall, setOpenSmall] = React.useState(false);
  const [openMedium, setOpenMedium] = React.useState(false);
  const [openLarge, setOpenLarge] = React.useState(false);

  return (
    <div className="flex flex-wrap items-center gap-4">
      <Dialog open={openSmall} onOpenChange={setOpenSmall}>
        <DialogTrigger asChild>
          <Button variant="outline">Otwórz Small Modal</Button>
        </DialogTrigger>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Small Modal (400px)</DialogTitle>
            <DialogDescription>
              To jest modal o szerokości 400px. Idealny dla prostych potwierdzeń lub krótkich formularzy.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-body text-muted-foreground">
              Modal wykorzystuje animacje fade-in/out oraz slide-in z tokenami motion Fluent 2.0.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenSmall(false)}>
              Anuluj
            </Button>
            <Button onClick={() => setOpenSmall(false)}>Zatwierdź</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openMedium} onOpenChange={setOpenMedium}>
        <DialogTrigger asChild>
          <Button variant="outline">Otwórz Medium Modal</Button>
        </DialogTrigger>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>Medium Modal (600px)</DialogTitle>
            <DialogDescription>
              To jest modal o szerokości 600px. Standardowy rozmiar dla większości dialogów.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-body">
              Modal medium jest idealny dla:
            </p>
            <ul className="list-disc list-inside space-y-2 text-body-small text-muted-foreground">
              <li>Formularzy z kilkoma polami</li>
              <li>Szczegółowych informacji</li>
              <li>Potwierdzeń z dodatkowym kontekstem</li>
            </ul>
            <p className="text-body text-muted-foreground">
              Wszystkie modale mają backdrop blur i półprzezroczyste tło zgodnie z Fluent 2.0.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenMedium(false)}>
              Anuluj
            </Button>
            <Button onClick={() => setOpenMedium(false)}>Zatwierdź</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openLarge} onOpenChange={setOpenLarge}>
        <DialogTrigger asChild>
          <Button variant="outline">Otwórz Large Modal</Button>
        </DialogTrigger>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>Large Modal (800px)</DialogTitle>
            <DialogDescription>
              To jest modal o szerokości 800px. Przeznaczony dla złożonych formularzy i szczegółowych widoków.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-body">
              Modal large oferuje więcej przestrzeni dla:
            </p>
            <ul className="list-disc list-inside space-y-2 text-body-small text-muted-foreground">
              <li>Długich formularzy z wieloma polami</li>
              <li>Szczegółowych ustawień</li>
              <li>Treści wymagających więcej miejsca</li>
              <li>Złożonych interakcji użytkownika</li>
            </ul>
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <p className="text-body-small font-semibold mb-2">Fluent 2.0 Features:</p>
              <ul className="list-disc list-inside space-y-1 text-caption text-muted-foreground">
                <li>Animacje fade-in/out (300ms)</li>
                <li>Backdrop blur dla lepszej głębi</li>
                <li>Focus trap dla dostępności</li>
                <li>Zamknięcie przez Escape lub kliknięcie poza modal</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenLarge(false)}>
              Anuluj
            </Button>
            <Button onClick={() => setOpenLarge(false)}>Zatwierdź</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

