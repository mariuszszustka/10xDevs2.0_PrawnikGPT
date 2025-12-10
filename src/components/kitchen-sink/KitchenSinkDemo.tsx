import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import DialogDemo from "./DialogDemo";
import { CheckCircle2, AlertCircle, Info, XCircle, Sparkles } from "lucide-react";

export default function KitchenSinkDemo() {
  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="text-display mb-4">Fluent 2.0 Design System</h1>
          <p className="text-body-large text-muted-foreground">
            Kompletna prezentacja komponentów UI z tokenami Microsoft Fluent 2.0
          </p>
        </div>

        {/* Typography Section */}
        <section className="mb-16">
          <Card variant="elevated" className="mb-8">
            <CardHeader>
              <CardTitle>Typography Scale</CardTitle>
              <CardDescription>
                Hierarchia typografii Fluent 2.0 z 5 poziomami
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <p className="text-display mb-2">Display</p>
                <p className="text-caption text-muted-foreground">
                  68px, Bold, line-height 1.2 - Hero sections
                </p>
              </div>
              <div>
                <p className="text-title mb-2">Title</p>
                <p className="text-caption text-muted-foreground">
                  42px, Semibold, line-height 1.3 - Główne nagłówki sekcji
                </p>
              </div>
              <div>
                <p className="text-headline mb-2">Headline</p>
                <p className="text-caption text-muted-foreground">
                  28px, Semibold, line-height 1.4 - Nagłówki kart, modali
                </p>
              </div>
              <div>
                <p className="text-body-large mb-2">Body Large</p>
                <p className="text-caption text-muted-foreground">
                  18px, Regular, line-height 1.5 - Wyróżniona treść
                </p>
              </div>
              <div>
                <p className="text-body mb-2">Body</p>
                <p className="text-caption text-muted-foreground">
                  16px, Regular, line-height 1.5 - Główna treść, odpowiedzi czatu
                </p>
              </div>
              <div>
                <p className="text-body-small mb-2">Body Small</p>
                <p className="text-caption text-muted-foreground">
                  14px, Regular, line-height 1.5 - Pomocnicza treść
                </p>
              </div>
              <div>
                <p className="text-caption mb-2">Caption</p>
                <p className="text-caption text-muted-foreground">
                  12px, Regular, line-height 1.4 - Metadane, timestamps, labels
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Buttons Section */}
        <section className="mb-16">
          <Card variant="elevated" className="mb-8">
            <CardHeader>
              <CardTitle>Buttons</CardTitle>
              <CardDescription>
                Wszystkie warianty i rozmiary przycisków Fluent 2.0
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Sizes */}
              <div>
                <h3 className="text-headline mb-4">Rozmiary</h3>
                <div className="flex flex-wrap items-center gap-4">
                  <Button size="sm">Small (24px)</Button>
                  <Button size="default">Medium (32px)</Button>
                  <Button size="lg">Large (40px)</Button>
                </div>
              </div>

              {/* Variants */}
              <div>
                <h3 className="text-headline mb-4">Warianty</h3>
                <div className="flex flex-wrap items-center gap-4">
                  <Button variant="default">Primary</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="outline">Outline</Button>
                  <Button variant="subtle">Subtle</Button>
                  <Button variant="ghost">Ghost</Button>
                  <Button variant="link">Link</Button>
                  <Button variant="destructive">Destructive</Button>
                </div>
              </div>

              {/* States */}
              <div>
                <h3 className="text-headline mb-4">Stany</h3>
                <div className="flex flex-wrap items-center gap-4">
                  <Button>Normal</Button>
                  <Button disabled>Disabled</Button>
                  <Button>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Z ikoną
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Inputs Section */}
        <section className="mb-16">
          <Card variant="elevated" className="mb-8">
            <CardHeader>
              <CardTitle>Inputs</CardTitle>
              <CardDescription>
                Pola tekstowe z walidacją i różnymi rozmiarami
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="text-body-small mb-2 block">Small Input (32px)</label>
                <Input size="sm" placeholder="Wprowadź tekst..." />
              </div>
              <div>
                <label className="text-body-small mb-2 block">Medium Input (40px)</label>
                <Input size="md" placeholder="Wprowadź tekst..." />
              </div>
              <div>
                <label className="text-body-small mb-2 block">Large Input (48px)</label>
                <Input size="lg" placeholder="Wprowadź tekst..." />
              </div>
              <div>
                <label className="text-body-small mb-2 block">Disabled Input</label>
                <Input disabled placeholder="Wyłączone pole..." />
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Textarea Section */}
        <section className="mb-16">
          <Card variant="elevated" className="mb-8">
            <CardHeader>
              <CardTitle>Textarea</CardTitle>
              <CardDescription>
                Wieloliniowe pola tekstowe z różnymi rozmiarami
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="text-body-small mb-2 block">Small Textarea</label>
                <Textarea size="sm" placeholder="Wprowadź dłuższy tekst..." rows={3} />
              </div>
              <div>
                <label className="text-body-small mb-2 block">Medium Textarea</label>
                <Textarea size="md" placeholder="Wprowadź dłuższy tekst..." rows={4} />
              </div>
              <div>
                <label className="text-body-small mb-2 block">Large Textarea</label>
                <Textarea size="lg" placeholder="Wprowadź dłuższy tekst..." rows={5} />
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Cards Section */}
        <section className="mb-16">
          <Card variant="elevated" className="mb-8">
            <CardHeader>
              <CardTitle>Cards</CardTitle>
              <CardDescription>
                Warianty kart z różnymi stylami
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-3">
                <Card variant="elevated" className="cursor-pointer">
                  <CardHeader>
                    <CardTitle>Elevated Card</CardTitle>
                    <CardDescription>Z cieniem i efektem hover</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-body">Treść karty z shadow-md, która zmienia się na shadow-lg przy hover.</p>
                  </CardContent>
                </Card>

                <Card variant="filled">
                  <CardHeader>
                    <CardTitle>Filled Card</CardTitle>
                    <CardDescription>Bez cienia, z tłem</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-body">Karta z wypełnionym tłem, bez cienia.</p>
                  </CardContent>
                </Card>

                <Card variant="outlined">
                  <CardHeader>
                    <CardTitle>Outlined Card</CardTitle>
                    <CardDescription>Z pogrubioną ramką</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-body">Karta z wyraźną ramką (border-2).</p>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Badges Section */}
        <section className="mb-16">
          <Card variant="elevated" className="mb-8">
            <CardHeader>
              <CardTitle>Badges</CardTitle>
              <CardDescription>
                Oznaczenia i etykiety z różnymi wariantami
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-4">
                <Badge variant="default">Default</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="destructive">Destructive</Badge>
                <Badge variant="success">Success</Badge>
                <Badge variant="warning">Warning</Badge>
                <Badge variant="outline">Outline</Badge>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Alerts Section */}
        <section className="mb-16">
          <Card variant="elevated" className="mb-8">
            <CardHeader>
              <CardTitle>Alerts</CardTitle>
              <CardDescription>
                Komunikaty informacyjne, ostrzeżenia i błędy
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert variant="default">
                <Info className="h-4 w-4" />
                <AlertTitle>Informacja</AlertTitle>
                <AlertDescription>
                  To jest domyślny alert z informacją dla użytkownika.
                </AlertDescription>
              </Alert>

              <Alert variant="success">
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>Sukces</AlertTitle>
                <AlertDescription>
                  Operacja zakończona pomyślnie. Wszystko działa poprawnie.
                </AlertDescription>
              </Alert>

              <Alert variant="warning">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Ostrzeżenie</AlertTitle>
                <AlertDescription>
                  Uwaga! Ta operacja może mieć nieoczekiwane konsekwencje.
                </AlertDescription>
              </Alert>

              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertTitle>Błąd</AlertTitle>
                <AlertDescription>
                  Wystąpił błąd podczas przetwarzania żądania. Spróbuj ponownie.
                </AlertDescription>
              </Alert>

              <Alert variant="info">
                <Info className="h-4 w-4" />
                <AlertTitle>Informacja</AlertTitle>
                <AlertDescription>
                  Dodatkowe informacje o aktualnym stanie systemu.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </section>

        {/* Dialog Section */}
        <section className="mb-16">
          <Card variant="elevated" className="mb-8">
            <CardHeader>
              <CardTitle>Dialog / Modal</CardTitle>
              <CardDescription>
                Modale z różnymi rozmiarami i animacjami Fluent 2.0
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DialogDemo />
            </CardContent>
          </Card>
        </section>

        {/* Colors Section */}
        <section className="mb-16">
          <Card variant="elevated" className="mb-8">
            <CardHeader>
              <CardTitle>Color Tokens</CardTitle>
              <CardDescription>
                Paleta kolorów Fluent 2.0 z neonowym zielonym primary
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2">
                  <div className="h-20 rounded-lg bg-primary flex items-center justify-center">
                    <span className="text-primary-foreground font-semibold">Primary</span>
                  </div>
                  <p className="text-caption text-muted-foreground">Neonowy zielony</p>
                </div>
                <div className="space-y-2">
                  <div className="h-20 rounded-lg bg-secondary flex items-center justify-center">
                    <span className="text-secondary-foreground font-semibold">Secondary</span>
                  </div>
                  <p className="text-caption text-muted-foreground">Zielony odcień</p>
                </div>
                <div className="space-y-2">
                  <div className="h-20 rounded-lg bg-destructive flex items-center justify-center">
                    <span className="text-destructive-foreground font-semibold">Destructive</span>
                  </div>
                  <p className="text-caption text-muted-foreground">Czerwony</p>
                </div>
                <div className="space-y-2">
                  <div className="h-20 rounded-lg bg-muted flex items-center justify-center">
                    <span className="text-muted-foreground font-semibold">Muted</span>
                  </div>
                  <p className="text-caption text-muted-foreground">Szary</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Shadows Section */}
        <section className="mb-16">
          <Card variant="elevated" className="mb-8">
            <CardHeader>
              <CardTitle>Shadow Tokens</CardTitle>
              <CardDescription>
                System cieni Fluent 2.0 z 8 poziomami
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <div className="p-6 rounded-lg bg-card border shadow-2xs">
                  <p className="text-body-small font-semibold mb-2">2xs</p>
                  <p className="text-caption text-muted-foreground">Subtle separators</p>
                </div>
                <div className="p-6 rounded-lg bg-card border shadow-xs">
                  <p className="text-body-small font-semibold mb-2">xs</p>
                  <p className="text-caption text-muted-foreground">Subtle separators</p>
                </div>
                <div className="p-6 rounded-lg bg-card border shadow-sm">
                  <p className="text-body-small font-semibold mb-2">sm</p>
                  <p className="text-caption text-muted-foreground">Cards, inputs</p>
                </div>
                <div className="p-6 rounded-lg bg-card border shadow-md">
                  <p className="text-body-small font-semibold mb-2">md</p>
                  <p className="text-caption text-muted-foreground">Cards, inputs</p>
                </div>
                <div className="p-6 rounded-lg bg-card border shadow-lg">
                  <p className="text-body-small font-semibold mb-2">lg</p>
                  <p className="text-caption text-muted-foreground">Modals, popovers</p>
                </div>
                <div className="p-6 rounded-lg bg-card border shadow-xl">
                  <p className="text-body-small font-semibold mb-2">xl</p>
                  <p className="text-caption text-muted-foreground">Modals, popovers</p>
                </div>
                <div className="p-6 rounded-lg bg-card border shadow-2xl">
                  <p className="text-body-small font-semibold mb-2">2xl</p>
                  <p className="text-caption text-muted-foreground">Elevated surfaces</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Spacing Section */}
        <section className="mb-16">
          <Card variant="elevated" className="mb-8">
            <CardHeader>
              <CardTitle>Spacing Tokens</CardTitle>
              <CardDescription>
                Skala odstępów oparta na 4px base unit
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-1 h-4 bg-primary rounded"></div>
                  <span className="text-body-small">1 (4px)</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-2 h-4 bg-primary rounded"></div>
                  <span className="text-body-small">2 (8px)</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-3 h-4 bg-primary rounded"></div>
                  <span className="text-body-small">3 (12px)</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-4 h-4 bg-primary rounded"></div>
                  <span className="text-body-small">4 (16px)</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-5 h-4 bg-primary rounded"></div>
                  <span className="text-body-small">5 (20px)</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-6 h-4 bg-primary rounded"></div>
                  <span className="text-body-small">6 (24px)</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-8 h-4 bg-primary rounded"></div>
                  <span className="text-body-small">8 (32px)</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-4 bg-primary rounded"></div>
                  <span className="text-body-small">10 (40px)</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-4 bg-primary rounded"></div>
                  <span className="text-body-small">12 (48px)</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-4 bg-primary rounded"></div>
                  <span className="text-body-small">16 (64px)</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Footer */}
        <div className="text-center text-body-small text-muted-foreground">
          <p>Fluent 2.0 Design System - PrawnikGPT</p>
          <p className="mt-2">Wszystkie komponenty używają tokenów CSS zgodnych z Microsoft Fluent 2.0</p>
        </div>
      </div>
    </div>
  );
}

