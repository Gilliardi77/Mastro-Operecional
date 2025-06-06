import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Palette, ImageIcon, Brain } from 'lucide-react';
import AISuggestionForm from '@/components/ai/AISuggestionForm';
import ModulePromptGeneratorForm from '@/components/ai/ModulePromptGeneratorForm';

export default function Home() {
  return (
    <div className="space-y-12">
      <section className="text-center">
        <h2 className="font-headline text-3xl font-bold tracking-tight text-primary sm:text-4xl">
          Welcome to Business Maestro Module Extension
        </h2>
        <p className="mt-4 text-lg text-muted-foreground">
          Leverage powerful tools and AI to build consistent and professional modules for your Business Maestro application.
        </p>
      </section>

      {/* ShadCN UI Showcase Section */}
      <section id="ui-showcase" aria-labelledby="ui-showcase-title">
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle id="ui-showcase-title" className="flex items-center gap-2 font-headline text-2xl text-primary">
              <Palette className="h-7 w-7" />
              ShadCN UI Showcase
            </CardTitle>
            <CardDescription>
              Explore a variety of pre-styled ShadCN UI components.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <h4 className="font-semibold">Buttons</h4>
                <div className="flex flex-wrap gap-2">
                  <Button>Default</Button>
                  <Button variant="destructive">Destructive</Button>
                  <Button variant="outline">Outline</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="ghost">Ghost</Button>
                  <Button variant="link">Link</Button>
                </div>
              </div>
              <div className="space-y-4">
                <h4 className="font-semibold">Input with Label</h4>
                <div className="space-y-2">
                  <Label htmlFor="name-input">Name</Label>
                  <Input id="name-input" type="text" placeholder="Enter your name" />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <h4 className="font-semibold">Checkbox & Switch</h4>
                <div className="flex items-center space-x-2">
                  <Checkbox id="terms-checkbox" />
                  <Label htmlFor="terms-checkbox">Accept terms and conditions</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch id="notifications-switch" />
                  <Label htmlFor="notifications-switch">Enable notifications</Label>
                </div>
              </div>
              <div className="space-y-4">
                <h4 className="font-semibold">Select</h4>
                <Select>
                  <SelectTrigger className="w-full md:w-[280px]">
                    <SelectValue placeholder="Select a fruit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="apple">Apple</SelectItem>
                    <SelectItem value="banana">Banana</SelectItem>
                    <SelectItem value="blueberry">Blueberry</SelectItem>
                    <SelectItem value="grapes">Grapes</SelectItem>
                    <SelectItem value="pineapple">Pineapple</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="outline">Learn More</Button>
          </CardFooter>
        </Card>
      </section>

      {/* Image Optimization Section */}
      <section id="image-optimization" aria-labelledby="image-optimization-title">
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle id="image-optimization-title" className="flex items-center gap-2 font-headline text-2xl text-primary">
              <ImageIcon className="h-7 w-7" />
              Image Optimization
            </CardTitle>
            <CardDescription>
              Using `next/image` for optimized images and placeholders.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <div className="relative h-64 w-full max-w-md overflow-hidden rounded-lg shadow-md sm:h-80 md:h-96">
              <Image
                src="https://placehold.co/600x400.png"
                alt="Placeholder Business Team"
                layout="fill"
                objectFit="cover"
                data-ai-hint="business team"
              />
            </div>
          </CardContent>
          <CardFooter>
            <p className="text-sm text-muted-foreground">
              Placeholder images include `data-ai-hint` for relevant image suggestions.
            </p>
          </CardFooter>
        </Card>
      </section>

      {/* AI Content Generation Section */}
      <section id="ai-generation" aria-labelledby="ai-generation-title">
        <div className="text-center mb-8">
            <h2 id="ai-generation-title" className="flex items-center justify-center gap-2 font-headline text-2xl text-primary">
              <Brain className="h-7 w-7" />
              AI Powered Generation Tools
            </h2>
            <p className="mt-2 text-muted-foreground">
                Utilize Genkit integration for intelligent content and prompt creation.
            </p>
        </div>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <AISuggestionForm />
          <ModulePromptGeneratorForm />
        </div>
      </section>
    </div>
  );
}
